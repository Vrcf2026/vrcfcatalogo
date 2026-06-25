import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Plus, X } from "lucide-react";
import { SPEC_LABELS } from "@/lib/specLabels";

const TECLADO_OPTIONS = ["PT", "ES", "Internacional", "Personalizável"];

// Campos fixos do separador "Specs" — pensados originalmente para o mundo
// Escritório (computadores/portáteis). Specs específicas de outros mundos
// aparecem em "Outras especificações".
export const SPEC_FIELDS = [
  { key: "tipo", label: "Tipo", options: ["Portátil", "Desktop", "Tudo-em-Um", "Servidor", "Monitor", "Tablet"] },
  { key: "grau", label: "Grau", options: ["A", "B", "C"] },
  { key: "teclado", label: "Teclado", options: TECLADO_OPTIONS },
  { key: "processador", label: "Processador" },
  { key: "geracao", label: "Geração" },
  { key: "grafica", label: "Placa Gráfica" },
  { key: "ram_gb", label: "RAM (GB)" },
  { key: "ram_tipo", label: "Tipo RAM" },
  { key: "ram_slots", label: "Slots RAM" },
  { key: "ram_ampliavel", label: "RAM Ampliável", options: ["Sim", "Não"] },
  { key: "armazenamento_gb", label: "Armazenamento (GB)" },
  { key: "armazenamento_tipo", label: "Tipo Armazenamento" },
  { key: "ecra_polegadas", label: "Ecrã (polegadas)" },
  { key: "resolucao", label: "Resolução", options: ["HD", "HD+", "Full HD", "4K"] },
  { key: "tactil", label: "Táctil", options: ["Sim", "Não"] },
  { key: "sistema_operativo", label: "Sistema Operativo" },
  { key: "leitor_gravador", label: "Leitor/Gravador", options: ["DVD", "Não"] },
  { key: "webcam", label: "Webcam", options: ["Sim", "Não"] },
  { key: "wifi", label: "Wi-Fi", options: ["Sim", "Não"] },
  { key: "bluetooth", label: "Bluetooth", options: ["Sim", "Não"] },
  { key: "portas", label: "Portas" },
  { key: "cor", label: "Cor" },
] as const;

export const SPEC_FIELD_KEYS = new Set(SPEC_FIELDS.map(f => f.key as string));
export const SPEC_SPECIAL_KEYS = new Set(["teclado_nota"]);

interface Props {
  specs: Record<string, string>;
  specsLocked: string[];
  updateSpec: (key: string, val: string) => void;
  toggleLock: (key: string) => void;
  newSpecKey: string; setNewSpecKey: (v: string) => void;
  newSpecValue: string; setNewSpecValue: (v: string) => void;
  addCustomSpec: () => void;
}

export function EditProductSpecs(p: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground -mt-1 mb-2">
        <Lock className="inline h-3 w-3 mr-1" />
        Trancar um campo impede que a próxima importação o sobrescreva.
      </p>
      {SPEC_FIELDS.map((field) => {
        const { key, label } = field;
        const options = "options" in field ? field.options : undefined;
        const locked = p.specsLocked.includes(key);
        return (
          <div key={key} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
            <Label className="text-sm">{label}</Label>
            {options ? (
              <Select value={p.specs[key] || ""} onValueChange={(v) => p.updateSpec(key, v === "_none" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input className="h-8 text-sm" value={p.specs[key] || ""} onChange={(e) => p.updateSpec(key, e.target.value)} placeholder="—" />
            )}
            <Button
              type="button" variant="ghost" size="icon" className="h-8 w-8"
              title={locked ? "Trancado — a importação não vai alterar este campo" : "Trancar este campo"}
              onClick={() => p.toggleLock(key)}
            >
              {locked ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          </div>
        );
      })}
      {p.specs.teclado && p.specs.teclado !== "PT" && (
        <div className="space-y-2">
          <Label className="text-sm">Nota de teclado</Label>
          <Textarea
            rows={2}
            className="text-sm"
            value={p.specs.teclado_nota || ""}
            onChange={(e) => p.updateSpec("teclado_nota", e.target.value)}
            placeholder="Nota a mostrar ao cliente sobre o teclado..."
          />
        </div>
      )}

      {Object.keys(p.specs).filter(k => !SPEC_FIELD_KEYS.has(k) && !SPEC_SPECIAL_KEYS.has(k)).length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Outras especificações
          </p>
          {Object.keys(p.specs)
            .filter(k => !SPEC_FIELD_KEYS.has(k) && !SPEC_SPECIAL_KEYS.has(k))
            .sort()
            .map((key) => {
              const locked = p.specsLocked.includes(key);
              const label = SPEC_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div key={key} className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 items-center">
                  <Label className="text-sm" title={key}>{label}</Label>
                  <Input
                    className="h-8 text-sm"
                    value={p.specs[key] || ""}
                    onChange={(e) => p.updateSpec(key, e.target.value)}
                    placeholder="—"
                  />
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8"
                    title={locked ? "Trancado — a importação não vai alterar este campo" : "Trancar este campo"}
                    onClick={() => p.toggleLock(key)}
                  >
                    {locked ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Remover esta especificação"
                    onClick={() => p.updateSpec(key, "")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
        </div>
      )}

      <div className="space-y-2 pt-4 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Adicionar especificação
        </p>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            className="h-8 text-sm"
            placeholder="Nome (ex: Alcance Infravermelhos)"
            value={p.newSpecKey}
            onChange={(e) => p.setNewSpecKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); p.addCustomSpec(); } }}
          />
          <Input
            className="h-8 text-sm"
            placeholder="Valor (ex: 30 metros)"
            value={p.newSpecValue}
            onChange={(e) => p.setNewSpecValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); p.addCustomSpec(); } }}
          />
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={p.addCustomSpec} title="Adicionar especificação">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Fica disponível como filtro técnico no catálogo (ex: "Alcance Infravermelhos" → 30 metros).
        </p>
      </div>
    </div>
  );
}

export default EditProductSpecs;
