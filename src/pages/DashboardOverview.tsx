import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import { formatCurrency, formatNumber } from "@/lib/analytics";
import { KPICard } from "@/components/KPICard";
import { ChartCard } from "@/components/ChartCard";
import { HourlyChart } from "@/components/charts/HourlyChart";
import { DailyChart } from "@/components/charts/DailyChart";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { DollarSign, ShoppingCart, Receipt, CreditCard, TrendingUp, Calendar, Loader2 } from "lucide-react";

export default function DashboardOverview() {
  const { analytics, isLoading, refreshData } = useData();

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 mt-4 text-lg font-medium">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-destructive/10 p-3">
          <TrendingUp className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold">Failed to Load Analytics</h3>
        <p className="max-w-md text-center text-muted-foreground">
          We couldn't connect to the server or there is no data available.
          Please ensure the backend is running and you have uploaded a sales report.
        </p>
        <button
          onClick={() => refreshData()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { kpis, hourly, daily, categories, topProducts } = analytics;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Real-time performance metrics for your retail store</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Revenue" value={formatCurrency(kpis.totalRevenue)} change={kpis.revenueChange} icon={<DollarSign className="h-5 w-5" />} delay={0} />
        <KPICard title="Qty Sold" value={formatNumber(kpis.totalQuantity)} change={kpis.quantityChange} icon={<ShoppingCart className="h-5 w-5" />} delay={50} />
        <KPICard title="Total Bills" value={formatNumber(kpis.totalBills)} icon={<Receipt className="h-5 w-5" />} delay={100} />
        <KPICard title="Avg Bill Value" value={formatCurrency(kpis.avgBillValue)} icon={<CreditCard className="h-5 w-5" />} delay={150} />
        <KPICard title="Today's Sales" value={formatCurrency(kpis.todayRevenue)} subtitle="Current day" icon={<TrendingUp className="h-5 w-5" />} delay={200} />
        <KPICard title="MTD Revenue" value={formatCurrency(kpis.mtdRevenue)} subtitle="Month to date" icon={<Calendar className="h-5 w-5" />} delay={250} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Today's Hourly Sales" subtitle="Revenue by hour of day" delay={300}>
          <HourlyChart data={hourly} metric="revenue" />
        </ChartCard>
        <ChartCard title="Daily Trend" subtitle="Revenue over time" delay={350}>
          <DailyChart data={daily} metric="revenue" />
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue by Category" subtitle="Distribution across sections" delay={400}>
          <CategoryPieChart data={categories} />
        </ChartCard>
        <ChartCard title="Top Products" subtitle="By revenue" delay={450}>
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((p, i) => (
              <div key={p.itemCode} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{p.itemCode}</p>
                  <p className="text-xs text-muted-foreground">{p.department || p.section}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-card-foreground tabular-nums">{formatCurrency(p.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(p.totalQuantity)} units</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
