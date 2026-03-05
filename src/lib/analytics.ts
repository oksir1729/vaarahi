import { SalesRecord, FilterState } from "@/types/sales";

// Apply filters to raw data (client-side search/filter)
export function filterData(data: SalesRecord[], filters: FilterState): SalesRecord[] {
  return data.filter(record => {
    if (filters.dateRange.from && new Date(record.BILL_DATE) < filters.dateRange.from) return false;
    if (filters.dateRange.to && new Date(record.BILL_DATE) > filters.dateRange.to) return false;
    if (filters.category && filters.category !== "all" && record.SECTION !== filters.category) return false;
    if (filters.department && filters.department !== "all" && record.DEPORTMENT !== filters.department) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!record.DESC.toLowerCase().includes(s) && !record.ITEM_CODE.toLowerCase().includes(s)) return false;
    }
    return true;
  });
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString("en-IN");
}
