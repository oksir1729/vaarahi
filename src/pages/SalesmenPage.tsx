import { useState, useEffect, useRef } from "react";
import { useData } from "@/hooks/useData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricToggle } from "@/components/MetricToggle";
import { formatCurrency, formatNumber } from "@/lib/analytics";
import { Loader2, Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, LineChart, Line } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const metricOptions = [
    { label: "Revenue", value: "revenue" },
    { label: "Quantity", value: "quantity" },
];

export default function SalesmenPage() {
    const { analytics, isLoading, filters } = useData();
    const [metric, setMetric] = useState<"revenue" | "quantity">("revenue");
    const [selectedSmCode, setSelectedSmCode] = useState<string | null>(null);
    const [smAnalytics, setSmAnalytics] = useState<any>(null);
    const [isSmLoading, setIsSmLoading] = useState(false);
    const [timeframe, setTimeframe] = useState<"daily" | "monthly" | "yearly">("monthly");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

    const [tableData, setTableData] = useState<any[]>([]);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const targetRef = useRef<HTMLDivElement>(null);

    // Reset pagination when any filter changes
    useEffect(() => {
        setPage(1);
    }, [filters, searchQuery, sortOrder, metric]);

    useEffect(() => {
        if (!selectedSmCode) {
            setSmAnalytics(null);
            return;
        }
        async function fetchSm() {
            setIsSmLoading(true);
            try {
                const queryParts = [];
                if (filters.category && filters.category.length > 0) queryParts.push(`category=${encodeURIComponent(filters.category.join(','))}`);
                if (filters.department && filters.department.length > 0) queryParts.push(`department=${encodeURIComponent(filters.department.join(','))}`);
                if (filters.search) queryParts.push(`search=${encodeURIComponent(filters.search)}`);
                if (filters.site && filters.site.length > 0 && !filters.site.includes('all')) queryParts.push(`site=${encodeURIComponent(filters.site.join(','))}`);
                if (filters.dateRange.from) queryParts.push(`from=${filters.dateRange.from.toISOString().split('T')[0]}`);
                if (filters.dateRange.to) queryParts.push(`to=${filters.dateRange.to.toISOString().split('T')[0]}`);
                queryParts.push(`salesman=${encodeURIComponent(selectedSmCode)}`);
                const queryStr = queryParts.join('&');

                const res = await fetch(`/api/analytics?${queryStr}`);
                if (res.ok) {
                    const data = await res.json();
                    setSmAnalytics(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsSmLoading(false);
            }
        }
        fetchSm();
    }, [selectedSmCode, filters]);

    if (isLoading || !analytics) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-lg font-medium">Loading salesman data...</span>
            </div>
        );
    }

    useEffect(() => {
        async function fetchTable() {
            setIsTableLoading(true);
            try {
                const queryParts = [];
                if (filters.category && filters.category.length > 0) queryParts.push(`category=${encodeURIComponent(filters.category.join(','))}`);
                if (filters.department && filters.department.length > 0) queryParts.push(`department=${encodeURIComponent(filters.department.join(','))}`);
                if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);
                if (filters.site && filters.site.length > 0 && !filters.site.includes('all')) queryParts.push(`site=${encodeURIComponent(filters.site.join(','))}`);
                if (filters.dateRange.from) queryParts.push(`from=${filters.dateRange.from.toISOString().split('T')[0]}`);
                if (filters.dateRange.to) queryParts.push(`to=${filters.dateRange.to.toISOString().split('T')[0]}`);
                queryParts.push(`sortBy=${encodeURIComponent(metric)}`);
                queryParts.push(`sortOrder=${encodeURIComponent(sortOrder)}`);
                queryParts.push(`page=${page}&limit=15`);

                const queryStr = queryParts.join('&');
                const res = await fetch(`/api/salesmen_table?${queryStr}`);

                if (res.ok) {
                    const data = await res.json();
                    setTableData(data.data || []);
                    setTotalPages(data.pagination?.totalPages || 1);
                }
            } catch (err) {
                console.error("Failed to fetch salesmen table", err);
            } finally {
                setIsTableLoading(false);
            }
        }

        // Use a small debounce for search query to avoid spamming the backend
        const timeoutId = setTimeout(() => fetchTable(), 300);
        return () => clearTimeout(timeoutId);
    }, [filters, searchQuery, sortOrder, metric, page]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Salesman Performance</h2>
                    <p className="text-sm text-muted-foreground mt-1">Analyze revenue and quantity sold by each salesman</p>
                </div>
                <div className="self-start sm:self-auto">
                    <MetricToggle options={metricOptions} value={metric} onChange={v => setMetric(v as "revenue" | "quantity")} />
                </div>
            </div>

            <div className="grid gap-6">

                {/* Performance Time Series Graph */}
                <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
                    <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Salesman Rankings</CardTitle>
                            <CardDescription>Detailed metrics for all salesmen</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or code..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9 w-full sm:w-[250px]"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-1 whitespace-nowrap"
                                onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                            >
                                <ArrowUpDown className="h-4 w-4" />
                                {sortOrder === "desc" ? "Highest First" : "Lowest First"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                                <TableRow className="hover:bg-transparent border-b-muted/50">
                                    <TableHead className="w-[100px]">Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isTableLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : tableData.map((sm: any, index: number) => (
                                    <TableRow
                                        key={sm.smCode}
                                        className={`hover:bg-muted/50 transition-colors cursor-pointer ${selectedSmCode === sm.smCode ? 'bg-muted border-l-4 border-l-primary' : ''}`}
                                        onClick={() => {
                                            setSelectedSmCode(sm.smCode);
                                            setTimeout(() => {
                                                targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }, 50);
                                        }}
                                    >
                                        <TableCell className="font-medium text-muted-foreground">{sm.smCode}</TableCell>
                                        <TableCell className="font-semibold">{sm.name}</TableCell>
                                        <TableCell className="text-right font-medium">{formatNumber(sm.totalQuantity)}</TableCell>
                                        <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(sm.totalRevenue)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!isTableLoading && tableData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No salesman data found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Controls */}
                        {!isTableLoading && tableData.length > 0 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t bg-secondary/20">
                                <div className="text-sm font-medium text-muted-foreground">
                                    Page {page} of {totalPages}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 lg:px-3 gap-1"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        <span className="hidden sm:inline-block">Previous</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 lg:px-3 gap-1"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                    >
                                        <span className="hidden sm:inline-block">Next</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Performance Time Series Graph */}
            <Card ref={targetRef} className="border-0 shadow-sm bg-card/50 backdrop-blur-sm relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Historical Performance</CardTitle>
                        <CardDescription>
                            {selectedSmCode
                                ? `Viewing trend for ${tableData.find(sm => sm.smCode === selectedSmCode)?.name || selectedSmCode}`
                                : "Select a salesman from the table above to view their performance over time"}
                        </CardDescription>
                    </div>
                    {selectedSmCode && (
                        <div className="flex flex-wrap bg-muted/50 p-1 rounded-lg gap-1">
                            <button onClick={() => setTimeframe("daily")} className={`flex-1 px-3 py-1.5 sm:py-1 text-xs font-medium rounded-md transition-colors ${timeframe === "daily" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Daily</button>
                            <button onClick={() => setTimeframe("monthly")} className={`flex-1 px-3 py-1.5 sm:py-1 text-xs font-medium rounded-md transition-colors ${timeframe === "monthly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
                            <button onClick={() => setTimeframe("yearly")} className={`flex-1 px-3 py-1.5 sm:py-1 text-xs font-medium rounded-md transition-colors ${timeframe === "yearly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Yearly</button>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {!selectedSmCode ? (
                        <div className="h-[300px] flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-card/50 text-center p-8">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <span className="text-xl">📈</span>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Select a Salesman</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Click on a salesman row in the Rankings table to analyze their specific daily, monthly, and yearly performance trends.
                            </p>
                        </div>
                    ) : isSmLoading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : smAnalytics && smAnalytics[timeframe]?.length > 0 ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={smAnalytics[timeframe].slice().reverse()} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey={timeframe === 'yearly' ? 'year' : timeframe === 'monthly' ? 'month' : 'date'}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                        tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                                        labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}
                                        formatter={(value: number, name: string) => [
                                            name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                                            name === 'revenue' ? 'Revenue' : 'Quantity'
                                        ]}
                                    />
                                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="quantity" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl">
                            No trend data available for this timeframe.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
