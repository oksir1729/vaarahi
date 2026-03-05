import { useMemo, useState } from "react";
import { useData } from "@/hooks/useData";
import { formatCurrency, formatNumber } from "@/lib/analytics";
import { ChartCard } from "@/components/ChartCard";
import { MetricToggle } from "@/components/MetricToggle";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

const sortOptions = [
  { label: "By Revenue", value: "revenue" },
  { label: "By Quantity", value: "quantity" },
];

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProductsPage() {
  const { analytics, isLoading, refreshData } = useData();
  const [sortBy, setSortBy] = useState<"revenue" | "quantity">("revenue");

  useEffect(() => {
    refreshData(sortBy);
  }, [sortBy, refreshData]);

  if (isLoading || !analytics) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg font-medium">Loading product data...</span>
      </div>
    );
  }

  const { topProducts: products } = analytics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Product Insights</h2>
          <p className="text-sm text-muted-foreground mt-1">Top performing products across your store</p>
        </div>
        <MetricToggle options={sortOptions} value={sortBy} onChange={v => setSortBy(v as "revenue" | "quantity")} />
      </div>

      {/* Top 5 highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {products.slice(0, 5).map((p, i) => (
          <div key={p.itemCode} className="rounded-xl bg-card p-4 card-shadow border border-border/50 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[10px] font-bold text-accent-foreground">#{i + 1}</span>
              <span className="text-xs text-muted-foreground">{p.section}</span>
            </div>
            <p className="text-sm font-semibold text-card-foreground truncate">{p.itemCode}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-bold text-card-foreground">{formatCurrency(p.totalRevenue)}</span>
              <span className="text-xs text-muted-foreground">{formatNumber(p.totalQuantity)} pcs</span>
            </div>
          </div>
        ))}
      </div>

      {/* Full table */}
      <ChartCard title="All Products" subtitle={`${products.length} products found`} delay={300}>
        <div className="overflow-x-auto -mx-5 px-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, i) => (
                <TableRow key={p.itemCode}>
                  <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-card-foreground">{p.itemCode}</p>
                      <p className="text-xs text-muted-foreground">{p.department || 'Unknown Department'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.section}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatNumber(p.totalQuantity)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(p.totalRevenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ChartCard>
    </div>
  );
}
