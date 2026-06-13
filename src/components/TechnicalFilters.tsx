import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { SPEC_LABELS } from "@/lib/specLabels";

interface TechnicalFiltersProps {
  products: any[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string | null) => void;
}

// Extract the most relevant spec keys across the current product set
export const TechnicalFilters = ({ products, activeFilters, onFilterChange }: TechnicalFiltersProps) => {
  const specOptions = useMemo(() => {
    const map: Record<string, Map<string, number>> = {};
    products.forEach((p) => {
      const specs = (p.especificacoes ?? {}) as Record<string, unknown>;
      Object.entries(specs).forEach(([k, v]) => {
        if (v == null || v === "") return;
        const val = String(v).trim();
        if (val.length > 40) return;
        if (!map[k]) map[k] = new Map();
        map[k].set(val, (map[k].get(val) ?? 0) + 1);
      });
    });
    return Object.entries(map)
      .map(([key, vals]) => ({
        key,
        values: [...vals.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([v, c]) => ({ value: v, count: c })),
      }))
      .filter((g) => g.values.length > 1)
      .slice(0, 6);
  }, [products]);

  if (specOptions.length === 0) return null;

  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-foreground">Filtros técnicos</h3>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => Object.keys(activeFilters).forEach((k) => onFilterChange(k, null))}
          >
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>
      {specOptions.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="text-xs font-medium capitalize text-muted-foreground">{SPEC_LABELS[group.key] ?? group.key.replace(/_/g, " ")}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.values.map(({ value, count }) => {
              const active = activeFilters[group.key] === value;
              return (
                <Badge
                  key={value}
                  variant={active ? "default" : "secondary"}
                  className="cursor-pointer text-[11px]"
                  onClick={() => onFilterChange(group.key, active ? null : value)}
                >
                  {value} <span className="ml-1 opacity-60">{count}</span>
                </Badge>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
