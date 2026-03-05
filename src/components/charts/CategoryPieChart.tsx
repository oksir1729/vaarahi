import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CategorySales } from "@/types/sales";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(222 40% 40%)",
];

interface Props {
  data: CategorySales[];
}

export function CategoryPieChart({ data }: Props) {
  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <ResponsiveContainer width={220} height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={3}
            dataKey="revenue"
            nameKey="category"
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2 min-w-0">
        {data.map((cat, i) => (
          <div key={cat.category} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="truncate text-card-foreground">{cat.category}</span>
            <span className="ml-auto font-medium text-card-foreground tabular-nums">{cat.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
