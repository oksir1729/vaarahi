import express from 'express';
import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import Papa from 'papaparse';
import pool from './db.js'; // Note: using .js extension for ES modules if needed, or depends on tsconfig
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const upload = multer({ dest: 'uploads/' });

// Basic route to check server status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Route to fetch sales data
app.get('/api/sales', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sales_data ORDER BY bill_date DESC, bill_time DESC LIMIT 1000');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

// Route to fetch unique sections and departments
app.get('/api/filters', async (req, res) => {
  try {
    const sections = await pool.query('SELECT DISTINCT section_type FROM sales_data WHERE section_type IS NOT NULL ORDER BY section_type');
    const departments = await pool.query('SELECT DISTINCT department FROM sales_data WHERE department IS NOT NULL ORDER BY department');
    res.json({
      sections: sections.rows.map(r => r.section_type),
      departments: departments.rows.map(r => r.department)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// Route to handle file upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;

  try {
    let data: any[] = [];

    if (fileName.endsWith('.csv')) {
      const csvFile = fs.readFileSync(filePath, 'utf8');
      const results = Papa.parse(csvFile, { header: true, skipEmptyLines: true });
      data = results.data;
    } else if (fileName.endsWith('.xlsx')) {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(worksheet);
    } else {
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    // Insert data into PostgreSQL
    // We'll use the mapping logic found in sampleData.ts
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Optional: Clear existing data if needed, but usually we append
      // await client.query('DELETE FROM sales_data');

      for (const row of data) {
        // Mapping (based on sampleData.ts logic - might need adjustment based on exact headers)
        // Since we don't know the exact headers of the uploaded file, 
        // we'll try to map common ones or use the index-based approach if generic.
        // However, sheet_to_json uses headers. Let's look at sampleData.ts mapping again.

        // Date parsing: DD-MM-YYYY -> YYYY-MM-DD
        const rawDate = row['BILL_DATE'] || row['Date'] || '';
        let formattedDate = rawDate;
        if (typeof rawDate === 'string' && rawDate.includes('-')) {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }

        await client.query(
          `INSERT INTO sales_data (
            item_code, bill_date, bill_time, item_desc, section_type, department, 
            cat2, cat3, cat4, cat5, cat6, sm_code, sm_name, bill_quantity, net_amount, site,
            cp, basic_amount, tax_amt
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            row['ITEM CODE'] || row['Item Code'] || row['ITEM_CODE'] || 'UNKNOWN',
            formattedDate || null,
            row['BILL_TIME'] || '00:00:00',
            row['VENDOR'] || row['DESC'] || row['Description'] || '',
            row['SECTION TYPE'] || row['SECTION'] || row['Category'] || 'Other',
            row['DEPARTMENT'] || row['DEPORTMENT'] || row['Department'] || 'General',
            row['CAT2'] || '',
            row['CAT3'] || '',
            row['CAT4'] || '',
            row['CAT5'] || '',
            row['CAT6'] || '',
            row['SM CODE'] || row['SM_CODE'] || row['sm_code'] || 'UNKNOWN',
            row['SM NAME'] || row['SM_NAME'] || row['sm_name'] || 'Unknown Salesman',
            Number(row['BILL_QUANTITY'] || row['Quantity']) || 0,
            Number(row['NET_AMOUNT'] || row['Amount']) || 0,
            row['SITE'] || row['Site'] || row['site'] || 'Default Site',
            Number(row['CP'] || row['cp']) || 0,
            Number(row['BASIC_AMOUNT'] || row['Basic Amount'] || row['basic_amount']) || 0,
            Number(row['TAX AMT'] || row['Tax Amt'] || row['tax_amt']) || 0
          ]
        );
      }

      await client.query('COMMIT');
      res.json({ message: `Successfully uploaded and saved ${data.length} records.` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process file' });
  } finally {
    // Delete temp file
    fs.unlinkSync(filePath);
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const { category, department, search, from, to, sortBy, salesman, site } = req.query;

    // Build dynamic WHERE clause
    const conditions: string[] = ['1=1']; // Dummy condition to simplify adding ANDs
    const params: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      conditions.push(`TRIM(LOWER(section_type)) = $${paramIndex++}`);
      params.push((category as string).toLowerCase().trim());
    }
    if (department && department !== 'all') {
      conditions.push(`TRIM(LOWER(department)) = $${paramIndex++}`);
      params.push((department as string).toLowerCase().trim());
    }
    if (search) {
      conditions.push(`(LOWER(department) LIKE $${paramIndex} OR LOWER(item_code) LIKE $${paramIndex})`);
      params.push(`%${(search as string).toLowerCase()}%`);
      paramIndex++;
    }
    if (salesman) {
      conditions.push(`sm_code = $${paramIndex++}`);
      params.push(salesman);
    }
    if (from) {
      conditions.push(`bill_date >= $${paramIndex++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`bill_date <= $${paramIndex++}`);
      params.push(to);
    }
    if (site && site !== 'all') {
      conditions.push(`TRIM(LOWER(site)) = $${paramIndex++}`);
      params.push((site as string).toLowerCase().trim());
    }

    const whereClause = conditions.join(' AND ');
    console.log("Analytics Request:", { category, department, search, from, to, site });
    console.log("WHERE Clause:", whereClause, "Params:", params);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;

    // 1. KPIs
    // We need to carefully add the base whereClause to time-specific CTEs
    const kpiQuery = `
      WITH filtered_data AS (
        SELECT * FROM sales_data WHERE ${whereClause}
      ),
      stats AS (
        SELECT 
          SUM(net_amount) as total_revenue,
          SUM(bill_quantity) as total_quantity,
          COUNT(DISTINCT CONCAT(bill_date, bill_time)) as total_bills,
          SUM(net_amount - COALESCE(cp, 0)) as total_profit,
          SUM(COALESCE(tax_amt, 0)) as total_tax,
          SUM(COALESCE(basic_amount, 0)) as total_basic_amount,
          SUM(CASE WHEN bill_date = $${paramIndex} THEN net_amount ELSE 0 END) as today_revenue,
          SUM(CASE WHEN bill_date >= $${paramIndex + 1} THEN net_amount ELSE 0 END) as mtd_revenue
        FROM filtered_data
      ),
      last30 AS (
        SELECT SUM(net_amount) as rev, SUM(bill_quantity) as qty
        FROM filtered_data WHERE bill_date >= CURRENT_DATE - INTERVAL '30 days'
      ),
      prev30 AS (
        SELECT SUM(net_amount) as rev, SUM(bill_quantity) as qty
        FROM filtered_data WHERE bill_date >= CURRENT_DATE - INTERVAL '60 days' AND bill_date < CURRENT_DATE - INTERVAL '30 days'
      )
      SELECT 
        s.*,
        l30.rev as last30_rev, p30.rev as prev30_rev,
        l30.qty as last30_qty, p30.qty as prev30_qty
      FROM stats s, last30 l30, prev30 p30
    `;
    const kpiParams = [...params, today, monthStart];
    const kpiResult = await pool.query(kpiQuery, kpiParams);
    const s = kpiResult.rows[0] || {};

    // Calculate changes
    const revChange = s.prev30_rev > 0 ? ((s.last30_rev - s.prev30_rev) / s.prev30_rev) * 100 : 0;
    const qtyChange = s.prev30_qty > 0 ? ((s.last30_qty - s.prev30_qty) / s.prev30_qty) * 100 : 0;

    const kpis = {
      totalRevenue: Number(s.total_revenue) || 0,
      totalQuantity: Number(s.total_quantity) || 0,
      totalBills: Number(s.total_bills) || 0,
      totalProfit: Number(s.total_profit) || 0,
      totalTax: Number(s.total_tax) || 0,
      totalBasicAmount: Number(s.total_basic_amount) || 0,
      avgBillValue: s.total_bills > 0 ? Number(s.total_revenue) / Number(s.total_bills) : 0,
      todayRevenue: Number(s.today_revenue) || 0,
      mtdRevenue: Number(s.mtd_revenue) || 0,
      revenueChange: revChange,
      quantityChange: qtyChange,
    };

    // 2. Hourly Sales
    const hourlyQuery = `
      SELECT 
        TO_CHAR(bill_time, 'HH24:00') as hour,
        SUM(net_amount) as revenue,
        SUM(bill_quantity) as quantity
      FROM sales_data
      WHERE ${whereClause}
      GROUP BY hour
      ORDER BY hour
    `;
    const hourlyResult = await pool.query(hourlyQuery, params);

    // 3. Daily Sales
    const dailyQuery = `
      SELECT 
        bill_date as date,
        SUM(net_amount) as revenue,
        SUM(bill_quantity) as quantity,
        COUNT(DISTINCT CONCAT(bill_date, bill_time)) as bills
      FROM sales_data
      WHERE ${whereClause}
      GROUP BY bill_date
      ORDER BY bill_date DESC
      LIMIT 30
    `;
    const dailyResult = await pool.query(dailyQuery, params);

    // 4. Monthly Sales
    const monthlyQuery = `
      SELECT 
        TO_CHAR(bill_date, 'YYYY-MM') as month,
        SUM(net_amount) as revenue,
        SUM(bill_quantity) as quantity
      FROM sales_data
      WHERE ${whereClause}
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `;
    const monthlyResult = await pool.query(monthlyQuery, params);

    // 4b. Yearly Sales
    const yearlyQuery = `
      SELECT 
        TO_CHAR(bill_date, 'YYYY') as year,
        SUM(net_amount) as revenue,
        SUM(bill_quantity) as quantity
      FROM sales_data
      WHERE ${whereClause}
      GROUP BY year
      ORDER BY year DESC
      LIMIT 5
    `;
    const yearlyResult = await pool.query(yearlyQuery, params);

    // 5. Category Sales
    const categoryQuery = `
      SELECT 
        section_type as category,
        SUM(net_amount) as revenue,
        SUM(bill_quantity) as quantity
      FROM sales_data
      WHERE ${whereClause}
      GROUP BY category
      ORDER BY revenue DESC
    `;
    const categoryResult = await pool.query(categoryQuery, params);
    const totalRev = categoryResult.rows.reduce((sum, r) => sum + Number(r.revenue), 0);
    const categories = categoryResult.rows.map(r => ({
      ...r,
      revenue: Number(r.revenue),
      quantity: Number(r.quantity),
      percentage: totalRev > 0 ? (Number(r.revenue) / totalRev) * 100 : 0
    }));

    // 5b. Department Sales
    const deptQuery = `
      SELECT 
        department,
        SUM(net_amount) as revenue,
        SUM(bill_quantity) as quantity
      FROM sales_data
      WHERE ${whereClause}
      GROUP BY department
      ORDER BY revenue DESC
    `;
    const deptResult = await pool.query(deptQuery, params);
    const totalDeptRev = deptResult.rows.reduce((sum, r) => sum + Number(r.revenue), 0);
    const departmentsData = deptResult.rows.map(r => ({
      ...r,
      revenue: Number(r.revenue),
      quantity: Number(r.quantity),
      percentage: totalDeptRev > 0 ? (Number(r.revenue) / totalDeptRev) * 100 : 0
    }));

    // 6. Top Products
    const sortField = sortBy === 'quantity' ? '"totalQuantity"' : '"totalRevenue"';
    const productsQuery = `
      SELECT 
        item_code as "itemCode",
        department as department,
        section_type as section,
        SUM(bill_quantity) as "totalQuantity",
        SUM(net_amount) as "totalRevenue"
      FROM sales_data
      WHERE ${whereClause}
      GROUP BY item_code, department, section_type
      ORDER BY ${sortField} DESC
      LIMIT 50
    `;
    const productsResult = await pool.query(productsQuery, params);

    // 7. Top Salesmen
    const salesmenQuery = `
      SELECT 
        sm_code as "smCode",
        sm_name as name,
        SUM(bill_quantity) as "totalQuantity",
        SUM(net_amount) as "totalRevenue"
      FROM sales_data
      WHERE ${whereClause} AND sm_code IS NOT NULL AND sm_code != 'UNKNOWN'
      GROUP BY sm_code, sm_name
      ORDER BY ${sortField} DESC
      LIMIT 20
    `;
    const salesmenResult = await pool.query(salesmenQuery, params);

    // 8. Sites
    const sitesQuery = `SELECT DISTINCT site FROM sales_data WHERE site IS NOT NULL AND TRIM(site) != '' ORDER BY site ASC;`;
    const sitesResult = await pool.query(sitesQuery);
    const sites = sitesResult.rows.map(r => r.site);

    res.json({
      kpis,
      hourly: hourlyResult.rows.map(r => ({ ...r, revenue: Number(r.revenue), quantity: Number(r.quantity) })),
      daily: dailyResult.rows.map(r => ({
        ...r,
        date: r.date.toISOString().split('T')[0],
        revenue: Number(r.revenue),
        quantity: Number(r.quantity),
        bills: Number(r.bills)
      })),
      monthly: monthlyResult.rows.map(r => ({ ...r, revenue: Number(r.revenue), quantity: Number(r.quantity) })),
      yearly: yearlyResult.rows.map(r => ({ ...r, revenue: Number(r.revenue), quantity: Number(r.quantity) })),
      categories,
      departments: departmentsData,
      sites,
      topProducts: productsResult.rows.map(r => ({
        ...r,
        totalQuantity: Number(r.totalQuantity),
        totalRevenue: Number(r.totalRevenue)
      })),
      topSalesmen: salesmenResult.rows.map(r => ({
        ...r,
        totalQuantity: Number(r.totalQuantity),
        totalRevenue: Number(r.totalRevenue)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/salesmen_table', async (req, res) => {
  try {
    const { category, department, search, from, to, site, sortBy, sortOrder } = req.query;

    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      conditions.push(`TRIM(LOWER(section_type)) = $${paramIndex++}`);
      params.push((category as string).toLowerCase().trim());
    }
    if (department && department !== 'all') {
      conditions.push(`TRIM(LOWER(department)) = $${paramIndex++}`);
      params.push((department as string).toLowerCase().trim());
    }
    if (from) {
      conditions.push(`bill_date >= $${paramIndex++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`bill_date <= $${paramIndex++}`);
      params.push(to);
    }
    if (site && site !== 'all') {
      conditions.push(`TRIM(LOWER(site)) = $${paramIndex++}`);
      params.push((site as string).toLowerCase().trim());
    }

    // Custom search for this table only (sm_name or sm_code)
    if (search) {
      conditions.push(`(LOWER(sm_name) LIKE $${paramIndex} OR LOWER(sm_code) LIKE $${paramIndex})`);
      params.push(`%${(search as string).toLowerCase()}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Sort logic
    const orderField = sortBy === 'quantity' ? '"totalQuantity"' : '"totalRevenue"';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const salesmenQuery = `
      SELECT 
        sm_code as "smCode",
        sm_name as name,
        SUM(bill_quantity) as "totalQuantity",
        SUM(net_amount) as "totalRevenue"
      FROM sales_data
      WHERE ${whereClause} AND sm_code IS NOT NULL AND sm_code != 'UNKNOWN'
      GROUP BY sm_code, sm_name
      ORDER BY ${orderField} ${orderDirection}
    `;

    const result = await pool.query(salesmenQuery, params);

    res.json(result.rows.map(r => ({
      ...r,
      totalQuantity: Number(r.totalQuantity),
      totalRevenue: Number(r.totalRevenue)
    })));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch salesmen table data' });
  }
});

// Serve frontend static files in production
const clientDistPath = path.join(__dirname, '../client_dist');
const localDistPath = path.join(__dirname, '../dist');

let activeDistPath: string | null = null;
if (fs.existsSync(clientDistPath)) {
  activeDistPath = clientDistPath;
} else if (fs.existsSync(localDistPath)) {
  activeDistPath = localDistPath;
}

if (activeDistPath) {
  console.log(`Serving static frontend from: ${activeDistPath}`);
  app.use(express.static(activeDistPath));

  // Handle React Router fallback (Redirects back to index.html for CSR)
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(activeDistPath!, 'index.html'));
  });
} else {
  // Catch-all if frontend isn't built yet
  app.get(/(.*)/, (req, res) => {
    res.status(404).send('Frontend not built. Run "npm run build" to generate the UI.');
  });
}

// Ensure Database tables exist before starting
try {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    console.log('Validating database schema...');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Database tables verified.');
  }
} catch (err) {
  console.error('Failed to initialize database tables:', err);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

