import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Package, PieChart, Menu, X, Store, Upload, Users, DollarSign } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardFilters } from "./DashboardFilters";

const navItems = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { label: "Finance", path: "/dashboard/finance", icon: DollarSign },
  { label: "Sales", path: "/dashboard/sales", icon: TrendingUp },
  { label: "Products", path: "/dashboard/products", icon: Package },
  { label: "Salesmen", path: "/dashboard/salesmen", icon: Users },
  { label: "Categories", path: "/dashboard/categories", icon: PieChart },
  { label: "Upload Data", path: "/dashboard/upload", icon: Upload },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <Store className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-primary">VAARAHI SILKS</h1>
            <p className="text-[11px] text-sidebar-muted">Analytics Dashboard</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-sidebar-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/30 p-3">
            <p className="text-xs font-medium text-sidebar-foreground">Live Data</p>
            <p className="text-[11px] text-sidebar-muted mt-0.5">Last updated: Just now</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] text-sidebar-muted">Streaming</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex flex-col md:flex-row md:items-center gap-4 border-b border-border bg-background/95 backdrop-blur-sm p-4 lg:px-6 min-h-[64px]">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden rounded-lg p-2 -ml-2 hover:bg-secondary transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="font-semibold lg:hidden">Dashboard</span>
            </div>
          </div>
          <DashboardFilters />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
