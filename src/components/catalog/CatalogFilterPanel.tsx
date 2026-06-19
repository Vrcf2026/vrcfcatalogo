import { useState } from "react";
import { X, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface TechSpecGroup {
  key: string;
  label: string;
  values: { value: string; count: number }[];
}

interface CatalogFilterPanelProps {
  visibleFamilies: any[];
  brands: any[];
  familyFilter: string;
  brandFilter: string | string[];          // multi-select
  stockFilter: string;
  techFilters: Record<string, string[]>;   // multi-select por spec
  techSpecOptions: TechSpecGroup[];
  activeFiltersCount: number;
  onFamilyChange: (id: string) => void;
  onBrandFilterChange: (ids: string[]) => void;
  onStockFilterChange: (v: string) => void;
  onTechFiltersChange: (next: Record<string, string[]>) => void;
  onPageReset: () => void;
  onClearAll: () => void;
}

function FilterSection({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && children}
    </div>
  );
}

export function CatalogFilterPanel({
  visibleFamilies,
  brands,
  familyFilter,
  brandFilter,
  stockFilter,
  techFilters,
  techSpecOptions,
  activeFiltersCount,
  onFamilyChange,
  onBrandFilterChange,
  onStockFilterChange,
  onTechFiltersChange,
  onPageReset,
  onClearAll,
}: CatalogFilterPanelProps) {
  const [brandSearch, setBrandSearch] = useState("");

  const selectedBrands = Array.isArray(brandFilter) ? brandFilter : (brandFilter !== "all" ? [brandFilter] : []);

  const filteredBrands = brands.filter((b: any) =>
    !brandSearch.trim() || b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const toggleBrand = (id: string) => {
    const next = selectedBrands.includes(id)
      ? selectedBrands.filter(b => b !== id)
      : [...selectedBrands, id];
    onBrandFilterChange(next);
    onPageReset();
  };

  const toggleSpec = (key: string, value: string) => {
    const current = techFilters[key] ?? [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    const updated = { ...techFilters };
    if (next.length === 0) delete updated[key];
    else updated[key] = next;
    onTechFiltersChange(updated);
    onPageReset();
  };

  return (
    <div className="space-y-5">
      {/* Stock */}
      <FilterSection title="Disponibilidade">
        <div className="space-y-1">
          {[
            { value: "all",      label: "Todos" },
            { value: "in_stock", label: "Em stock" },
            { value: "low",      label: "Stock baixo" },
            { value: "out",      label: "Por encomenda" },
          ].map((opt) => (
            <button key={opt.value}
              onClick={() => { onStockFilterChange(opt.value); onPageReset(); }}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                stockFilter === opt.value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Família */}
      {visibleFamilies.length > 0 && (
        <FilterSection title="Família">
          <div className="space-y-1">
            <button
              onClick={() => { onFamilyChange("all"); onPageReset(); }}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                familyFilter === "all"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Todas
            </button>
            {visibleFamilies.map((f: any) => (
              <button key={f.id}
                onClick={() => { onFamilyChange(familyFilter === f.id ? "all" : f.id); onPageReset(); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  familyFilter === f.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Marca — com pesquisa + multi-select */}
      {brands.length > 0 && (
        <FilterSection title="Marca">
          {brands.length > 6 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Pesquisar marca..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="h-7 pl-7 text-xs"
              />
            </div>
          )}
          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {filteredBrands.map((b: any) => {
              const active = selectedBrands.includes(b.id);
              return (
                <button key={b.id}
                  onClick={() => toggleBrand(b.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                    active ? "bg-primary border-primary" : "border-muted-foreground/40"
                  }`}>
                    {active && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
                  </span>
                  {b.name}
                </button>
              );
            })}
            {filteredBrands.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">Sem resultados</p>
            )}
          </div>
          {selectedBrands.length > 0 && (
            <button onClick={() => { onBrandFilterChange([]); onPageReset(); }}
              className="text-xs text-muted-foreground hover:text-primary mt-1 px-3">
              Limpar marcas
            </button>
          )}
        </FilterSection>
      )}

      {/* Specs técnicas — multi-select, sem Tipo separado */}
      {techSpecOptions.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especificações</p>
          {techSpecOptions.map(group => (
            <FilterSection key={group.key} title={group.label} defaultOpen={group.values.length <= 8}>
              <div className="flex flex-wrap gap-1.5">
                {group.values.map(({ value, count }) => {
                  const active = (techFilters[group.key] ?? []).includes(value);
                  return (
                    <button key={value}
                      onClick={() => toggleSpec(group.key, value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {value} <span className="opacity-50 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          ))}
        </div>
      )}

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={onClearAll}>
          <X className="h-3.5 w-3.5" /> Limpar todos os filtros
        </Button>
      )}
    </div>
  );
}

export default CatalogFilterPanel;
