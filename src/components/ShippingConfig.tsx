import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Truck, Package, Calculator } from "lucide-react";
import { calcularPorteDHL } from "@/lib/calcularPortes";

// Tabela DHL para exibição — espelha os valores de calcularPortes.ts
const DHL_TABELA_DISPLAY: [number, number][] = [
  [1, 3.65], [3, 3.78], [5, 3.78], [10, 4.37], [20, 4.88],
  [30, 5.20], [40, 6.22], [50, 7.59], [60, 9.08], [70, 10.59],
  [80, 12.11], [90, 13.62], [100, 15.13], [125, 18.51], [150, 22.22],
  [175, 25.92], [200, 29.62], [225, 33.33], [250, 37.03],
];

function AllTOPortesPanel() {
  const [pesoSim, setPesoSim] = useState("");
  const pesoNum = parseFloat(pesoSim.replace(",", ".")) || 0;
  const simulado = pesoNum > 0 ? calcularPorteDHL(pesoNum) : null;

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">allto</Badge>
        <span className="text-xs text-muted-foreground">Cálculo DHL por peso — tabela fixa (margem 15% sobre custo base)</span>
      </div>

      {/* Simulador */}
      <div className="bg-muted/40 rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5" /> Simulador de peso</p>
        <div className="flex items-center gap-2">
          <Input
            type="number" step="0.1" min="0" placeholder="kg"
            value={pesoSim} onChange={(e) => setPesoSim(e.target.value)}
            className="h-8 w-28 text-sm"
          />
          <span className="text-sm text-muted-foreground">kg →</span>
          {simulado != null ? (
            <span className="text-sm font-bold text-primary">
              {simulado.toFixed(2).replace(".", ",")} € s/IVA · {(simulado * 1.23).toFixed(2).replace(".", ",")} € c/IVA
            </span>
          ) : pesoNum > 250 ? (
            <span className="text-sm text-destructive">Peso &gt;250kg — contactar DHL</span>
          ) : (
            <span className="text-sm text-muted-foreground">introduz o peso</span>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Tabela de escalões (Portugal Continental)</p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1 pr-4 text-muted-foreground font-medium">Até (kg)</th>
              <th className="text-right py-1 pr-4 text-muted-foreground font-medium">Custo base s/IVA</th>
              <th className="text-right py-1 pr-4 text-muted-foreground font-medium">Com margem 15%</th>
              <th className="text-right py-1 text-muted-foreground font-medium">Cliente c/IVA</th>
            </tr>
          </thead>
          <tbody>
            {DHL_TABELA_DISPLAY.map(([limite, base]) => {
              const comMargem = Math.round(base * 1.15 * 100) / 100;
              const comIva = Math.round(comMargem * 1.23 * 100) / 100;
              return (
                <tr key={limite} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-1 pr-4 font-mono">{limite}</td>
                  <td className="py-1 pr-4 text-right text-muted-foreground">{base.toFixed(2)} €</td>
                  <td className="py-1 pr-4 text-right">{comMargem.toFixed(2)} €</td>
                  <td className="py-1 text-right font-semibold text-primary">{comIva.toFixed(2)} €</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[10px] text-muted-foreground mt-2">Para alterar estes valores, editar <code>src/lib/calcularPortes.ts</code> (DHL_TABELA + MARGEM_PORTES).</p>
      </div>
    </div>
  );
}

export function ShippingConfig() {
  const [saving, setSaving] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["shipping_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipping_config").select("*").order("fornecedor");
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async (config: any, updates: any) => {
    setSaving(config.id);
    try {
      const { error } = await supabase.from("shipping_config").update(updates).eq("id", config.id);
      if (error) throw error;
      toast.success(`Portes ${config.fornecedor} actualizados`);
      queryClient.invalidateQueries({ queryKey: ["shipping_config"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Configuração de Portes</h3>
        <p className="text-sm text-muted-foreground">Valores de envio por fornecedor — mostrados ao cliente no orçamento</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma configuração de portes encontrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config: any) => (
            <ConfigRow key={config.id} config={config} saving={saving === config.id} onSave={handleSave} />
          ))}
          <AllTOPortesPanel />
        </div>
      )}
    </div>
  );
}

function ConfigRow({ config, saving, onSave }: { config: any; saving: boolean; onSave: (c: any, u: any) => void }) {
  const [primeira, setPrimeira] = useState(config.preco_primeira_unidade?.toString() || "");
  const [adicional, setAdicional] = useState(config.preco_unidade_adicional?.toString() || "");
  const [ativo, setAtivo] = useState(!!config.ativo);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{config.fornecedor}</Badge>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
          <span className="text-xs text-muted-foreground">{ativo ? "Activo" : "Inactivo"}</span>
        </div>
        <Button size="sm" onClick={() => onSave(config, {
          preco_primeira_unidade: parseFloat(primeira),
          preco_unidade_adicional: parseFloat(adicional),
          ativo,
        })} disabled={saving} className="gap-1.5 h-7">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Guardar
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">1ª unidade (€ s/ IVA)</Label>
          <Input type="number" step="0.01" value={primeira} onChange={(e) => setPrimeira(e.target.value)} className="h-8 text-sm" />
          {primeira && <p className="text-xs text-muted-foreground">{parseFloat(primeira).toFixed(2)}€ + IVA = {(parseFloat(primeira) * 1.23).toFixed(2)}€</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unidade adicional (€ s/ IVA)</Label>
          <Input type="number" step="0.01" value={adicional} onChange={(e) => setAdicional(e.target.value)} className="h-8 text-sm" />
          {adicional && <p className="text-xs text-muted-foreground">{parseFloat(adicional).toFixed(2)}€ + IVA = {(parseFloat(adicional) * 1.23).toFixed(2)}€</p>}
        </div>
      </div>
    </div>
  );
}
