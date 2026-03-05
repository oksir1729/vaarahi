import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { SalesRecord, FilterState } from "@/types/sales";
import { toast } from "sonner";

interface DataContextType {
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
    sections: string[];
    departments: string[];
    analytics: {
        kpis: any;
        hourly: any[];
        daily: any[];
        monthly: any[];
        yearly: any[];
        categories: any[];
        departments: any[];
        sites: string[];
        topProducts: any[];
        topSalesmen: any[];
    } | null;
    isLoading: boolean;
    refreshData: (sortBy?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
    const [sections, setSections] = useState<string[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [analytics, setAnalytics] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [filters, setFilters] = useState<FilterState>({
        dateRange: { from: undefined, to: undefined },
        category: "",
        department: "",
        search: "",
        site: "all",
    });

    const refreshData = useCallback(async (sortBy: string = 'revenue') => {
        setIsLoading(true);
        try {
            // Build query string from filters
            const queryParts = [`sortBy=${encodeURIComponent(sortBy)}`];
            if (filters.category && filters.category !== 'all') queryParts.push(`category=${encodeURIComponent(filters.category)}`);
            if (filters.department && filters.department !== 'all') queryParts.push(`department=${encodeURIComponent(filters.department)}`);
            if (filters.site && filters.site !== 'all') queryParts.push(`site=${encodeURIComponent(filters.site)}`);
            if (filters.search) queryParts.push(`search=${encodeURIComponent(filters.search)}`);
            if (filters.dateRange.from) queryParts.push(`from=${filters.dateRange.from.toISOString().split('T')[0]}`);
            if (filters.dateRange.to) queryParts.push(`to=${filters.dateRange.to.toISOString().split('T')[0]}`);
            const queryStr = queryParts.join('&');

            const [filtersRes, analyticsRes] = await Promise.all([
                fetch('/api/filters'),
                fetch(`/api/analytics?${queryStr}`)
            ]);

            if (!filtersRes.ok || !analyticsRes.ok) throw new Error("Failed to fetch data");

            const filtersData = await filtersRes.json();
            const analyticsData = await analyticsRes.json();

            setSections(filtersData.sections);
            setDepartments(filtersData.departments);
            setAnalytics(analyticsData);
        } catch (err) {
            console.error(err);
            toast.error("Connecting to server failed. Please ensure the backend is running.");
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        refreshData('revenue');
    }, [filters.category, filters.department, filters.site, filters.search, filters.dateRange.from, filters.dateRange.to]); // Removed refreshData to prevent loop if it changes, though it's wrapped in useCallback

    const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    return (
        <DataContext.Provider value={{
            filters, setFilters, updateFilter,
            sections, departments, analytics, isLoading, refreshData
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error("useData must be used within DataProvider");
    return ctx;
}
