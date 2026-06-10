import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Truck } from "lucide-react";

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
