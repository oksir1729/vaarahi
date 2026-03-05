import { useMemo, useState } from "react";
import { useData } from "@/hooks/useData";
// No data logic needed here, handled by backend
import { ChartCard } from "@/components/ChartCard";
import { MetricToggle } from "@/components/MetricToggle";
import { HourlyChart } from "@/components/charts/HourlyChart";
import { DailyChart } from "@/components/charts/DailyChart";
import { MonthlyChart } from "@/components/charts/MonthlyChart";

const metricOptions = [
  { label: "Revenue", value: "revenue" },
  { label: "Quantity", value: "quantity" },
];

import { Loader2 } from "lucide-react";

export default function SalesPage() {
  const { analytics, isLoading } = useData();
  const [metric, setMetric] = useState<"revenue" | "quantity">("revenue");

  if (isLoading || !analytics) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg font-medium">Loading sales data...</span>
      </div>
    );
  }

  const { hourly, daily, monthly } = analytics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sales Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Detailed sales performance across time periods</p>
        </div>
        <MetricToggle options={metricOptions} value={metric} onChange={v => setMetric(v as "revenue" | "quantity")} />
      </div>

      <ChartCard title="Hourly Sales Pattern" subtitle="Average sales distribution by hour" delay={0}>
        <HourlyChart data={hourly} metric={metric} />
      </ChartCard>

      <ChartCard title="Daily Sales Trend" subtitle="Day-over-day performance" delay={100}>
        <DailyChart data={daily} metric={metric} />
      </ChartCard>

      <ChartCard title="Monthly Revenue" subtitle="Month-over-month growth" delay={200}>
        <MonthlyChart data={monthly} metric={metric} />
      </ChartCard>
    </div>
  );
}
