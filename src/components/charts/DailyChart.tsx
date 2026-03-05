import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DailySales } from "@/types/sales";
import { format } from "date-fns";

interface Props {
  data: DailySales[];
  metric: "revenue" | "quantity";
}

export function DailyChart({ data, metric }: Props) {
  const formatted = data.map(d => ({
    ...d,
    label: format(new Date(d.date), "MMM d"),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
          tickFormatter={v => metric === "revenue" ? `₹${(v/1000).toFixed(0)}K` : v.toString()} />
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number) => [metric === "revenue" ? `₹${value.toLocaleString()}` : value, metric === "revenue" ? "Revenue" : "Qty"]}
        />
        <Area type="monotone" dataKey={metric} stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#dailyGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
