import { useState } from "react";
import { X, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface TechSpecGroup {
  key: string;
  label: string;
  values: { value: string; count: number }[];
}

export interface FacetOption {
  id: string;
  name: string;
  count: number;
}

interface CatalogFilterPanelProps {
  // Facetas com contagens (já ordenadas desc por contagem)
  familyOptions: FacetOption[];
  typeOptions: FacetOption[];
  brandOptions: FacetOption[];

  // Estados (multi-select)
  familyFilter: string[];
  typeFilter: string[];
  brandFilter: string[];
  stockFilter: string;
  techFilters: Record<string, string[]>;
  techSpecOptions: TechSpecGroup[];
  activeFiltersCount: number;

  // Handlers
  onFamilyFilterChange: (ids: string[]) => void;
  onTypeFilterChange: (ids: string[]) => void;
  onBrandFilterChange: (ids: string[]) => void;
  onStockFilterChange: (v: string) => void;
  onTechFiltersChange: (next: Record<string, string[]>) => void;
  onPageReset: () => void;
  onClearAll: () => void;
}

function FilterSection({ title, count, children, defaultOpen = true }: {
  title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {title}
          {count != null && count > 0 && (
            <span className="text-[10px] font-semibold text-primary normal-case tracking-normal">({count})</span>
          )}
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && children}
    </div>
  );
}

const INITIAL_VISIBLE = 10;

function CheckList({
  options, selected, onToggle, searchable = false, emptyHint,
}: {
  options: FacetOption[];
  selected: string[];
  onToggle: (id: string) => void;
  searchable?: boolean;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = !query.trim()
    ? options
    : options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()));

  const visible = showAll || filtered.length <= INITIAL_VISIBLE
    ? filtered
    : filtered.slice(0, INITIAL_VISIBLE);

  if (options.length === 0) {
    return emptyHint ? <p className="text-xs text-muted-foreground px-1">{emptyHint}</p> : null;
  }

  return (
    <div className="space-y-1.5">
      {searchable && options.length > 8 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      )}
      <div className="space-y-0.5 max-h-[400px] overflow-y-auto pr-1">
        {visible.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button key={opt.id}
              onClick={() => onToggle(opt.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground/80 hover:bg-secondary"
              }`}
            >
              <span className={`h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                active ? "bg-primary border-primary" : "border-muted-foreground/40"
              }`}>
                {active && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
              </span>
              <span className="flex-1 truncate">{opt.name}</span>
              <span className="text-[10px] text-muted-foreground">{opt.count}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-1">Sem resultados</p>
        )}
      </div>
      {filtered.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="text-xs text-primary hover:underline px-1"
        >
          {showAll ? "Ver menos" : `Ver mais (${filtered.length - INITIAL_VISIBLE})`}
        </button>
      )}
    </div>
  );
}

export function CatalogFilterPanel({
  familyOptions,
  typeOptions,
  brandOptions,
  familyFilter,
  typeFilter,
  brandFilter,
  stockFilter,
  techFilters,
  techSpecOptions,
  activeFiltersCount,
  onFamilyFilterChange,
  onTypeFilterChange,
  onBrandFilterChange,
  onStockFilterChange,
  onTechFiltersChange,
  onPageReset,
  onClearAll,
}: CatalogFilterPanelProps) {

  const toggleIn = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

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
      {/* Família */}
      {familyOptions.length > 0 && (
        <FilterSection title="Família" count={familyFilter.length}>
          <CheckList
            options={familyOptions}
            selected={familyFilter}
            onToggle={(id) => { onFamilyFilterChange(toggleIn(familyFilter, id)); onPageReset(); }}
            searchable
          />
        </FilterSection>
      )}

      {/* Tipo — só após escolher família */}
      {familyFilter.length > 0 && (
        <FilterSection title="Tipo" count={typeFilter.length}>
          <CheckList
            options={typeOptions}
            selected={typeFilter}
            onToggle={(id) => { onTypeFilterChange(toggleIn(typeFilter, id)); onPageReset(); }}
            searchable
            emptyHint="Sem tipos disponíveis para esta família."
          />
        </FilterSection>
      )}

      {/* Marca */}
      {brandOptions.length > 0 && (
        <FilterSection title="Marca" count={brandFilter.length}>
          <CheckList
            options={brandOptions}
            selected={brandFilter}
            onToggle={(id) => { onBrandFilterChange(toggleIn(brandFilter, id)); onPageReset(); }}
            searchable
          />
        </FilterSection>
      )}

      {/* Disponibilidade */}
      <FilterSection title="Disponibilidade" defaultOpen={false}>
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

      {/* Specs técnicas */}
      {techSpecOptions.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especificações</p>
          {techSpecOptions.map(group => (
            <FilterSection
              key={group.key}
              title={group.label}
              count={(techFilters[group.key] ?? []).length}
              defaultOpen={false}
            >
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
                      {value} <span className="opacity-60 text-[10px]">({count})</span>
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
