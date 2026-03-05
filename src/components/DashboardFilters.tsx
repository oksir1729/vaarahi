import { useData } from "@/hooks/useData";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function DashboardFilters() {
  const { filters, updateFilter, sections, departments, analytics } = useData();
  const sites = analytics?.sites || [];

  const hasFilters = filters.category || filters.department || filters.search || filters.dateRange.from || (filters.site && filters.site !== 'all');

  const clearAll = () => {
    updateFilter("site", "all");
    updateFilter("category", "");
    updateFilter("department", "");
    updateFilter("search", "");
    updateFilter("dateRange", { from: undefined, to: undefined });
  };

  return (
    <div className="flex flex-1 items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative w-full max-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={filters.search}
          onChange={e => updateFilter("search", e.target.value)}
          className="pl-8 h-9 text-sm bg-secondary/50 border-0"
        />
      </div>

      {/* Date range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-9 text-sm gap-1.5 border-0 bg-secondary/50", filters.dateRange.from && "text-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {filters.dateRange.from ? (
              filters.dateRange.to ? (
                `${format(filters.dateRange.from, "MMM d")} - ${format(filters.dateRange.to, "MMM d")}`
              ) : format(filters.dateRange.from, "MMM d, yyyy")
            ) : "Date range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
            onSelect={(range) => updateFilter("dateRange", { from: range?.from, to: range?.to })}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Site */}
      <Select value={filters.site || "all"} onValueChange={v => updateFilter("site", v)}>
        <SelectTrigger className="h-9 w-[160px] text-sm border-0 bg-secondary/50">
          <SelectValue placeholder="Site" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sites</SelectItem>
          {sites.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Category */}
      <Select value={filters.category || "all"} onValueChange={v => updateFilter("category", v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-[160px] text-sm border-0 bg-secondary/50">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Department */}
      <Select value={filters.department || "all"} onValueChange={v => updateFilter("department", v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-[150px] text-sm border-0 bg-secondary/50">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearAll}>
          <X className="h-3 w-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
