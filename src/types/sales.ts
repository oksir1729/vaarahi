// Types for apparel retail sales data

export interface SalesRecord {
  BILL_DATE: string;
  BILL_TIME: string;
  ITEM_CODE: string;
  DESC: string;
  SECTION: string;
  DEPORTMENT: string;
  CAT2: string;
  CAT3: string;
  CAT4: string;
  CAT5: string;
  CAT6: string;
  BILL_QUANTITY: number;
  NET_AMOUNT: number;
}

export interface KPIData {
  totalRevenue: number;
  totalQuantity: number;
  totalBills: number;
  totalProfit: number;
  totalTax: number;
  totalBasicAmount: number;
  avgBillValue: number;
  todayRevenue: number;
  mtdRevenue: number;
  revenueChange: number;
  quantityChange: number;
}

export interface HourlySales {
  hour: string;
  revenue: number;
  quantity: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  quantity: number;
  bills: number;
}

export interface MonthlySales {
  month: string;
  revenue: number;
  quantity: number;
}

export interface ProductSales {
  itemCode: string;
  description: string;
  section: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface CategorySales {
  category: string;
  revenue: number;
  quantity: number;
  percentage: number;
}

export interface FilterState {
  dateRange: { from: Date | undefined; to: Date | undefined };
  category: string[];
  department: string[];
  search: string;
  site?: string[];
  cpRange: { min?: number; max?: number };
}
