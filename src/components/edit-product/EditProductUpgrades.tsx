import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface Upgrade { tipo: string; descricao: string; preco: string }

interface Props {
  upgrades: Upgrade[];
  addUpgrade: () => void;
  removeUpgrade: (i: number) => void;
  updateUpgrade: (i: number, field: string, val: string) => void;
}

export function EditProductUpgrades({ upgrades, addUpgrade, removeUpgrade, updateUpgrade }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Upgrades disponíveis para este produto</p>
        <Button size="sm" variant="outline" onClick={addUpgrade} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {upgrades.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
          Nenhum upgrade definido.<br />
          <span className="text-xs">Ex: +8GB RAM, Teclado PT, SSD adicional</span>
        </div>
      ) : upgrades.map((u, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upgrade {i + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeUpgrade(i)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={u.tipo} onValueChange={(v) => updateUpgrade(i, "tipo", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="memoria">Memória</SelectItem>
                  <SelectItem value="disco">Disco</SelectItem>
                  <SelectItem value="teclado">Teclado</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input className="h-8 text-xs" value={u.descricao} onChange={(e) => updateUpgrade(i, "descricao", e.target.value)} placeholder="Ex: +8GB RAM" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preço (+€)</Label>
              <Input className="h-8 text-xs" type="number" step="0.01" value={u.preco} onChange={(e) => updateUpgrade(i, "preco", e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default EditProductUpgrades;
