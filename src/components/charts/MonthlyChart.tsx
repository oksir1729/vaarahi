import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MonthlySales } from "@/types/sales";
import { format } from "date-fns";

interface Props {
  data: MonthlySales[];
  metric: "revenue" | "quantity";
}

export function MonthlyChart({ data, metric }: Props) {
  const formatted = data.map(d => ({
    ...d,
    label: format(new Date(d.month + "-01"), "MMM yyyy"),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
          tickFormatter={v => metric === "revenue" ? `₹${(v/1000).toFixed(0)}K` : v.toString()} />
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number) => [metric === "revenue" ? `₹${value.toLocaleString()}` : value, metric === "revenue" ? "Revenue" : "Qty"]}
        />
        <Bar dataKey={metric} fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
