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
      let workbook: any = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      let worksheet: any = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(worksheet);
      // Free massive AST objects from memory immediately
      workbook = null;
      worksheet = null;
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

      // Batch inserts to prevent Out of Memory (OOM) on large files
      const CHUNK_SIZE = 500;

      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        const queryValues: any[] = [];
        const valuePlaceholders: string[] = [];
        let paramIndex = 1;

        for (const row of chunk) {
          // Date parsing: DD-MM-YYYY -> YYYY-MM-DD or Excel Serial
          const rawDate = row['BILL_DATE'] || row['Date'] || '';
          let formattedDate = rawDate;

          const dateAsNumber = Number(rawDate);
          if (!isNaN(dateAsNumber) && String(rawDate).trim() !== '') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const dateObj = new Date(excelEpoch.getTime() + dateAsNumber * 86400000);
            formattedDate = dateObj.toISOString().split('T')[0];
          } else if (typeof rawDate === 'string' && rawDate.includes('-')) {
            const parts = rawDate.split('-');
            if (parts.length === 3) {
              formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }

          // Time parsing: HH:MM:SS or Excel Serial
          const rawTime = row['BILL_TIME'] || '';
          let formattedTime = rawTime || '00:00:00';

          const timeAsNumber = Number(rawTime);
          if (!isNaN(timeAsNumber) && String(rawTime).trim() !== '') {
            const timeOnly = timeAsNumber % 1;
            const totalSeconds = Math.round(timeOnly * 24 * 60 * 60);
            const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
            const seconds = (totalSeconds % 60).toString().padStart(2, '0');
            formattedTime = `${hours}:${minutes}:${seconds}`;
          } else if (typeof rawTime === 'string' && !isNaN(Number(rawDate)) && String(rawDate).trim() !== '') {
            formattedTime = rawTime.slice(0, 8);
          }

          queryValues.push(
            row['ITEM CODE'] || row['Item Code'] || row['ITEM_CODE'] || 'UNKNOWN',
            formattedDate || null,
            formattedTime,
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
          );

          const rowPlaceholders = [];
          for (let p = 0; p < 19; p++) {
            rowPlaceholders.push(`$${paramIndex++}`);
          }
          valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        const queryStr = `
          INSERT INTO sales_data (
            item_code, bill_date, bill_time, item_desc, section_type, department, 
            cat2, cat3, cat4, cat5, cat6, sm_code, sm_name, bill_quantity, net_amount, site,
            cp, basic_amount, tax_amt
          ) VALUES ${valuePlaceholders.join(', ')}
        `;

        await client.query(queryStr, queryValues);
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
    const { category, department, search, from, to, sortBy, salesman, site, minCp, maxCp } = req.query;

    // Build dynamic WHERE clause
    const conditions: string[] = ['1=1']; // Dummy condition to simplify adding ANDs
    const params: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string' && category !== 'all') {
      const categories = category.split(',').map(c => c.toLowerCase().trim());
      if (categories.length > 0) {
        conditions.push(`TRIM(LOWER(section_type)) = ANY($${paramIndex++})`);
        params.push(categories);
      }
    }
    if (department && typeof department === 'string' && department !== 'all') {
      const departments = department.split(',').map(d => d.toLowerCase().trim());
      if (departments.length > 0) {
        conditions.push(`TRIM(LOWER(department)) = ANY($${paramIndex++})`);
        params.push(departments);
      }
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
    if (site && typeof site === 'string' && site !== 'all') {
      const sites = site.split(',').map(s => s.toLowerCase().trim());
      if (sites.length > 0) {
        conditions.push(`TRIM(LOWER(site)) = ANY($${paramIndex++})`);
        params.push(sites);
      }
    }
    if (minCp && !isNaN(Number(minCp))) {
      conditions.push(`cp >= $${paramIndex++}`);
      params.push(Number(minCp));
    }
    if (maxCp && !isNaN(Number(maxCp))) {
      conditions.push(`cp <= $${paramIndex++}`);
      params.push(Number(maxCp));
    }

    const whereClause = conditions.join(' AND ');
    console.log("Analytics Request:", { category, department, search, from, to, site, minCp, maxCp });
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
      WITH recent_days AS (
        SELECT 
          bill_date as date,
          SUM(net_amount) as revenue,
          SUM(bill_quantity) as quantity,
          COUNT(DISTINCT CONCAT(bill_date, bill_time)) as bills
        FROM sales_data
        WHERE ${whereClause}
        GROUP BY bill_date
        ORDER BY bill_date DESC
        LIMIT 31
      )
      SELECT * FROM recent_days ORDER BY date ASC
    `;
    const dailyResult = await pool.query(dailyQuery, params);

    // 4. Monthly Sales
    const monthlyQuery = `
      WITH recent_months AS (
        SELECT 
          TO_CHAR(bill_date, 'YYYY-MM') as month,
          SUM(net_amount) as revenue,
          SUM(bill_quantity) as quantity
        FROM sales_data
        WHERE ${whereClause}
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      )
      SELECT * FROM recent_months ORDER BY month ASC
    `;
    const monthlyResult = await pool.query(monthlyQuery, params);

    const yearlyQuery = `
      WITH recent_years AS (
        SELECT 
          TO_CHAR(bill_date, 'YYYY') as year,
          SUM(net_amount) as revenue,
          SUM(bill_quantity) as quantity
        FROM sales_data
        WHERE ${whereClause}
        GROUP BY year
        ORDER BY year DESC
        LIMIT 5
      )
      SELECT * FROM recent_years ORDER BY year ASC
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
    const { category, department, search, from, to, site, sortBy, sortOrder, page = '1', limit = '15', minCp, maxCp } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 15;
    const offsetNum = (pageNum - 1) * limitNum;

    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string' && category !== 'all') {
      const categories = category.split(',').map(c => c.toLowerCase().trim());
      if (categories.length > 0) {
        conditions.push(`TRIM(LOWER(section_type)) = ANY($${paramIndex++})`);
        params.push(categories);
      }
    }
    if (department && typeof department === 'string' && department !== 'all') {
      const departments = department.split(',').map(d => d.toLowerCase().trim());
      if (departments.length > 0) {
        conditions.push(`TRIM(LOWER(department)) = ANY($${paramIndex++})`);
        params.push(departments);
      }
    }
    if (from) {
      conditions.push(`bill_date >= $${paramIndex++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`bill_date <= $${paramIndex++}`);
      params.push(to);
    }
    if (site && typeof site === 'string' && site !== 'all') {
      const sites = site.split(',').map(s => s.toLowerCase().trim());
      if (sites.length > 0) {
        conditions.push(`TRIM(LOWER(site)) = ANY($${paramIndex++})`);
        params.push(sites);
      }
    }
    // Custom search for this table only (sm_name or sm_code)
    if (search) {
      conditions.push(`(LOWER(sm_name) LIKE $${paramIndex} OR LOWER(sm_code) LIKE $${paramIndex})`);
      params.push(`%${(search as string).toLowerCase()}%`);
      paramIndex++;
    }
    if (minCp && !isNaN(Number(minCp))) {
      conditions.push(`cp >= $${paramIndex++}`);
      params.push(Number(minCp));
    }
    if (maxCp && !isNaN(Number(maxCp))) {
      conditions.push(`cp <= $${paramIndex++}`);
      params.push(Number(maxCp));
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
        SUM(net_amount) as "totalRevenue",
        COUNT(*) OVER() AS full_count
      FROM sales_data
      WHERE ${whereClause} AND sm_code IS NOT NULL AND sm_code != 'UNKNOWN'
      GROUP BY sm_code, sm_name
      ORDER BY ${orderField} ${orderDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limitNum, offsetNum);

    const result = await pool.query(salesmenQuery, params);

    const total = parseInt(result.rows[0]?.full_count || '0', 10);
    const data = result.rows.map(r => {
      const { full_count, ...rest } = r;
      return {
        ...rest,
        totalQuantity: Number(rest.totalQuantity),
        totalRevenue: Number(rest.totalRevenue)
      };
    });

    res.json({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch salesmen table data' });
  }
});

app.get('/api/search-suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`;

    const query = `
      SELECT suggestion, type FROM (
        SELECT DISTINCT TRIM(section_type) as suggestion, 'category' as type 
        FROM sales_data 
        WHERE LOWER(section_type) LIKE $1 AND section_type IS NOT NULL

        UNION 

        SELECT DISTINCT TRIM(department) as suggestion, 'department' as type 
        FROM sales_data 
        WHERE LOWER(department) LIKE $1 AND department IS NOT NULL

        UNION 

        SELECT DISTINCT TRIM(item_code) as suggestion, 'item' as type 
        FROM sales_data 
        WHERE LOWER(item_code) LIKE $1 AND item_code IS NOT NULL
      ) combined_suggestions
      ORDER BY suggestion ASC
      LIMIT 20
    `;

    const { rows } = await pool.query(query, [searchTerm]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching search suggestions:', err);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
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
