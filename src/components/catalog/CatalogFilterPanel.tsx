import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TechSpecGroup {
  key: string;
  label: string;
  values: { value: string; count: number }[];
}

interface CatalogFilterPanelProps {
  visibleFamilies: any[];
  visibleTypes: any[];
  brands: any[];
  familyFilter: string;
  typeFilter: string;
  brandFilter: string;
  techFilters: Record<string, string>;
  techSpecOptions: TechSpecGroup[];
  activeFiltersCount: number;
  onFamilyChange: (id: string) => void;
  onTypeChange: (id: string) => void;
  onBrandChange: (id: string) => void;
  onTechFiltersChange: (next: Record<string, string>) => void;
  onPageReset: () => void;
  onClearAll: () => void;
}

export function CatalogFilterPanel({
  visibleFamilies,
  visibleTypes,
  brands,
  familyFilter,
  typeFilter,
  brandFilter,
  techFilters,
  techSpecOptions,
  activeFiltersCount,
  onFamilyChange,
  onTypeChange,
  onBrandChange,
  onTechFiltersChange,
  onPageReset,
  onClearAll,
}: CatalogFilterPanelProps) {
  return (
    <div className="space-y-5">
      {visibleFamilies.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Família</p>
          <Select value={familyFilter} onValueChange={onFamilyChange}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as famílias</SelectItem>
              {visibleFamilies.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {visibleTypes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</p>
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {visibleTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Marca</p>
        <Select value={brandFilter} onValueChange={onBrandChange}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as marcas</SelectItem>
            {brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {techSpecOptions.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especificações</p>
          {techSpecOptions.map(group => (
            <div key={group.key} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground capitalize">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.values.map(({ value, count }) => {
                  const active = techFilters[group.key] === value;
                  return (
                    <button
                      key={value}
                      onClick={() => {
                        if (active) {
                          const n = { ...techFilters };
                          delete n[group.key];
                          onTechFiltersChange(n);
                        } else {
                          onTechFiltersChange({ ...techFilters, [group.key]: value });
                        }
                        onPageReset();
                      }}
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
            </div>
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
