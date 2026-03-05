import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function MetricToggle({ options, value, onChange }: Props) {
  return (
    <div className="flex rounded-lg bg-secondary p-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all",
            value === opt.value
              ? "bg-card text-card-foreground card-shadow"
              : "text-muted-foreground hover:text-card-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
