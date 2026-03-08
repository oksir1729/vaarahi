import { useState, useEffect } from "react";
import { useData } from "@/hooks/useData";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function DashboardFilters() {
  const { filters, updateFilter, sections, departments, analytics } = useData();
  const sites = analytics?.sites || [];

  const [localSearch, setLocalSearch] = useState(filters.search || "");
  const [suggestions, setSuggestions] = useState<{ suggestion: string, type: string }[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync with global filter if it gets cleared externally
  useEffect(() => {
    setLocalSearch(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (localSearch.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(localSearch)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Failed to fetch suggestions", err);
      }
    };

    const timer = setTimeout(() => {
      fetchSuggestions();
      updateFilter("search", localSearch);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearch, updateFilter]);

  const hasFilters = filters.category?.length > 0 || filters.department?.length > 0 || filters.search || filters.dateRange.from || filters.site?.length > 0;

  const clearAll = () => {
    updateFilter("site", []);
    updateFilter("category", []);
    updateFilter("department", []);
    setLocalSearch("");
    updateFilter("search", "");
    updateFilter("dateRange", { from: undefined, to: undefined });
  };

  const toggleArrayItem = (key: "category" | "department" | "site", item: string) => {
    const current = filters[key] || [];
    if (current.includes(item)) {
      updateFilter(key, current.filter(i => i !== item));
    } else {
      updateFilter(key, [...current, item]);
    }
  };

  return (
    <div className="flex flex-1 items-center gap-2 flex-wrap w-full md:w-auto">
      {/* Search */}
      <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full sm:w-auto sm:max-w-[220px] flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={localSearch}
              onChange={e => {
                setLocalSearch(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => { if (localSearch.length >= 2) setIsSearchOpen(true); }}
              className="pl-8 h-9 text-sm bg-secondary/50 border-0"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Command>
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {suggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((item, idx) => (
                    <CommandItem
                      key={`${item.suggestion}-${idx}`}
                      onSelect={() => {
                        setLocalSearch(item.suggestion);
                        updateFilter("search", item.suggestion);
                        setIsSearchOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <span>{item.suggestion}</span>
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        in {item.type}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-[140px] flex-1 sm:flex-none justify-start px-3 text-sm font-normal border-0 bg-secondary/50 shrink-0">
            {filters.site?.length > 0 ? `Sites (${filters.site.length})` : "All Sites"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-y-auto">
          <DropdownMenuLabel>Select Sites</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sites.map(s => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={filters.site?.includes(s)}
              onCheckedChange={() => toggleArrayItem("site", s)}
              onSelect={(e) => e.preventDefault()}
            >
              {s}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Category */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-[140px] flex-1 sm:flex-none justify-start px-3 text-sm font-normal border-0 bg-secondary/50 shrink-0">
            {filters.category?.length > 0 ? `Categories (${filters.category.length})` : "All Categories"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-y-auto">
          <DropdownMenuLabel>Select Categories</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sections.map(s => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={filters.category?.includes(s)}
              onCheckedChange={() => toggleArrayItem("category", s)}
              onSelect={(e) => e.preventDefault()}
            >
              {s}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Department */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-[140px] flex-1 sm:flex-none justify-start px-3 text-sm font-normal border-0 bg-secondary/50 shrink-0">
            {filters.department?.length > 0 ? `Departments (${filters.department.length})` : "All Departments"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-y-auto">
          <DropdownMenuLabel>Select Departments</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {departments.map(d => (
            <DropdownMenuCheckboxItem
              key={d}
              checked={filters.department?.includes(d)}
              onCheckedChange={() => toggleArrayItem("department", d)}
              onSelect={(e) => e.preventDefault()}
            >
              {d}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearAll}>
          <X className="h-3 w-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
