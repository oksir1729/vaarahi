import { useData } from "@/hooks/useData";
import { formatCurrency } from "@/lib/analytics";
import { KPICard } from "@/components/KPICard";
import { DollarSign, Percent, TrendingUp, HandCoins, Loader2 } from "lucide-react";

export default function FinancePage() {
    const { analytics, isLoading } = useData();

    if (isLoading || !analytics) {
        return (
            <div className="flex h-[400px] flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 mt-4 text-lg font-medium">Loading finance data...</span>
            </div>
        );
    }

    const { kpis } = analytics;

    // Calculate some margins for extra insight
    const profitMargin = kpis.totalRevenue > 0 ? (kpis.totalProfit / kpis.totalRevenue) * 100 : 0;
    const taxRate = kpis.totalBasicAmount > 0 ? (kpis.totalTax / kpis.totalBasicAmount) * 100 : 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Finance & Profitability</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Detailed breakdown of revenue, costs, taxes, and net profit
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Revenue (Net Amount)"
                    value={formatCurrency(kpis.totalRevenue)}
                    icon={<DollarSign className="h-5 w-5" />}
                    delay={0}
                />
                <KPICard
                    title="Total Profit"
                    value={formatCurrency(kpis.totalProfit)}
                    subtitle={`${profitMargin.toFixed(1)}% margin`}
                    icon={<TrendingUp className="h-5 w-5" />}
                    delay={100}
                />
                <KPICard
                    title="Basic Amount"
                    value={formatCurrency(kpis.totalBasicAmount)}
                    icon={<HandCoins className="h-5 w-5" />}
                    delay={200}
                />
                <KPICard
                    title="Total Tax"
                    value={formatCurrency(kpis.totalTax)}
                    subtitle={`~${taxRate.toFixed(1)}% effective rate`}
                    icon={<Percent className="h-5 w-5" />}
                    delay={300}
                />
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    This dashboard provides a top-level summary of your business finances based on the uploaded sales reports.
                    The <strong>Total Profit</strong> is calculated as the Net Amount minus the Cost Price (CP).
                    The <strong>Basic Amount</strong> represents the pre-tax, pre-discount value of goods sold, while the <strong>Total Tax</strong> reflects the sum of taxes collected on all transactions.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-6">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cost of Goods (CP)</p>
                        <p className="text-xl font-bold">{formatCurrency((kpis.totalRevenue || 0) - (kpis.totalProfit || 0))}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Profit per Bill</p>
                        <p className="text-xl font-bold">{formatCurrency(kpis.totalBills > 0 ? (kpis.totalProfit / kpis.totalBills) : 0)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tax-to-Revenue Ratio</p>
                        <p className="text-xl font-bold">{kpis.totalRevenue > 0 ? ((kpis.totalTax / kpis.totalRevenue) * 100).toFixed(2) : '0.00'}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
