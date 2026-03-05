import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import { formatCurrency, formatNumber } from "@/lib/analytics";
import { ChartCard } from "@/components/ChartCard";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { Loader2 } from "lucide-react";

export default function CategoriesPage() {
  const { analytics, isLoading, filters } = useData();

  if (isLoading || !analytics) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg font-medium">Loading category data...</span>
      </div>
    );
  }

  const { categories, departments } = analytics;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Category Performance</h2>
        <p className="text-sm text-muted-foreground mt-1">Revenue and quantity breakdown by product section</p>
      </div>

      {/* Category KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.slice(0, 6).map((cat, i) => (
          <div key={cat.category} className="rounded-xl bg-card p-5 card-shadow border border-border/50 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-card-foreground">{cat.category}</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {cat.percentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{formatCurrency(cat.revenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatNumber(cat.quantity)} items sold</p>
            {/* Mini progress bar */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${cat.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue Distribution" subtitle="Pie chart by category" delay={300}>
          <CategoryPieChart data={categories} />
        </ChartCard>
        <ChartCard title="Category Comparison" subtitle="Revenue bar chart" delay={350}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categories} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--chart-3))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="pt-6 border-t border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground">Department Performance</h2>
          <p className="text-sm text-muted-foreground mt-1">Revenue distribution by department</p>
        </div>

        {!filters.category ? (
          <div className="mt-4 flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-card/50 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Select a Category</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Department performance charts are generated based on a specific category. Please select a category from the filters at the top of the page to activate this section.
            </p>
          </div>
        ) : departments.length === 0 ? (
          <div className="mt-4 p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
            No department data available for this category.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Department Distribution" subtitle="Pie chart by department" delay={400}>
              <CategoryPieChart data={departments} />
            </ChartCard>
            <ChartCard title="Department Comparison" subtitle="Revenue bar chart" delay={450}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departments} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="department" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-4))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}
