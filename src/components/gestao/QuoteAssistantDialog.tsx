import { useState } from "react";
import { Loader2, Sparkles, Package, HelpCircle, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AssistantProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price: number | null;
  taxa_iva?: number | null;
  image_url?: string | null;
  stock_status?: string | null;
  fornecedor?: string | null;
  brand?: string | null;
  purchase_price?: number | null;
};

type AssistantLine = {
  necessidade: string;
  quantidade: number;
  tipo: "principal" | "acessorio" | "servico";
  nota: string;
  motivo: string;
  escolhido: AssistantProduct | null;
  alternativas: AssistantProduct[];
};

type AssistantResult = { resumo: string; perguntas: string[]; linhas: AssistantLine[] };

/** Linha que o assistente devolve ao orçamento: produto do catálogo ou linha manual. */
export type AssistantPick = { product: AssistantProduct | null; description: string; quantity: number };

type Row = { include: boolean; productId: string | null; quantity: string };

const TIPO_LABEL: Record<AssistantLine["tipo"], string> = {
  principal: "Principal",
  acessorio: "Acessório",
  servico: "Serviço",
};

const priceWithVat = (p: AssistantProduct) =>
  p.price != null ? Number(p.price) * (1 + (Number(p.taxa_iva) || 23) / 100) : null;

const eur = (v: number) => `${v.toFixed(2).replace(".", ",")} €`;

export function QuoteAssistantDialog({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (picks: AssistantPick[]) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const reset = () => { setResult(null); setRows([]); };

  const generate = async () => {
    setLoading(true);
    reset();
    try {
      const { data, error } = await supabase.functions.invoke("quote-assistant", { body: { text } });
      if (error || data?.error) throw new Error(data?.error ?? "O assistente não respondeu. Tente de novo.");
      const r = data as AssistantResult;
      setResult(r);
      setRows(r.linhas.map((l) => ({
        include: true,
        productId: l.escolhido?.id ?? null,
        quantity: String(l.quantidade),
      })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no assistente.");
    } finally {
      setLoading(false);
    }
  };

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const lineProduct = (i: number) =>
    result?.linhas[i].alternativas.find((p) => p.id === rows[i]?.productId) ?? null;

  const selected = rows.filter((r) => r.include).length;
  const total = rows.reduce((s, r, i) => {
    if (!r.include) return s;
    const p = lineProduct(i);
    const v = p ? priceWithVat(p) : null;
    return s + (v ?? 0) * (parseInt(r.quantity) || 0);
  }, 0);

  const confirm = () => {
    if (!result) return;
    const picks: AssistantPick[] = rows.flatMap((r, i) => {
      if (!r.include) return [];
      return [{
        product: lineProduct(i),
        description: result.linhas[i].necessidade,
        quantity: Math.max(1, parseInt(r.quantity) || 1),
      }];
    });
    onAdd(picks);
    toast.success(`${picks.length} linha${picks.length !== 1 ? "s" : ""} adicionada${picks.length !== 1 ? "s" : ""} ao orçamento.`);
    setText("");
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Assistente de orçamento
          </DialogTitle>
          <DialogDescription>
            Cole o pedido do cliente (email, mensagem ou notas da visita). A proposta usa produtos do catálogo e fica para rever antes de entrar no orçamento.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={result ? 3 : 7}
            placeholder="Ex: Boa tarde, tenho um armazém com cerca de 600 m² e dois portões. Queria câmaras para ver o exterior e a zona de cargas, com gravação de pelo menos 15 dias…"
          />
          <div className="flex justify-end">
            <Button onClick={generate} disabled={loading || text.trim().length < 10} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {result ? "Gerar de novo" : "Gerar proposta"}
            </Button>
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-6">
              A analisar o pedido e a procurar produtos no catálogo… (pode levar uns 20 segundos)
            </p>
          )}

          {result && (
            <>
              <p className="text-sm rounded-lg bg-muted/50 px-3 py-2">{result.resumo}</p>

              {result.perguntas.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
                  <p className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                    <HelpCircle className="h-4 w-4" /> Confirmar com o cliente
                  </p>
                  <ul className="mt-1 list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {result.perguntas.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                {result.linhas.map((l, i) => {
                  const r = rows[i];
                  const p = lineProduct(i);
                  const pv = p ? priceWithVat(p) : null;
                  return (
                    <div key={i} className={`rounded-lg border p-3 space-y-2 ${r?.include ? "" : "opacity-50"}`}>
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={r?.include}
                          onCheckedChange={(c) => update(i, { include: c === true })}
                          className="mt-0.5"
                          aria-label={`Incluir ${l.necessidade}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{l.necessidade}</span>
                            <Badge variant={l.tipo === "principal" ? "default" : "secondary"} className="text-[10px]">
                              {TIPO_LABEL[l.tipo]}
                            </Badge>
                          </div>
                          {(l.nota || l.motivo) && (
                            <p className="text-xs text-muted-foreground mt-0.5">{[l.nota, l.motivo].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                        <Input
                          type="number"
                          min={1}
                          value={r?.quantity ?? ""}
                          onChange={(e) => update(i, { quantity: e.target.value })}
                          className="h-8 w-20 text-sm"
                          aria-label="Quantidade"
                        />
                      </div>

                      {l.tipo === "servico" ? (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground pl-6">
                          <Wrench className="h-3.5 w-3.5" /> Entra como linha manual — defina o preço no orçamento.
                        </p>
                      ) : l.alternativas.length === 0 ? (
                        <p className="text-xs text-amber-700 dark:text-amber-400 pl-6">
                          Nenhum produto encontrado no catálogo — entra como linha manual.
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 pl-6">
                          {p?.image_url
                            ? <img src={p.image_url} alt="" className="h-9 w-9 rounded object-cover bg-muted shrink-0" />
                            : <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>}
                          <Select
                            value={r?.productId ?? "none"}
                            onValueChange={(v) => update(i, { productId: v === "none" ? null : v })}
                          >
                            <SelectTrigger className="h-9 text-xs flex-1 min-w-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">Linha manual (sem produto)</SelectItem>
                              {l.alternativas.map((a) => {
                                const av = priceWithVat(a);
                                return (
                                  <SelectItem key={a.id} value={a.id} className="text-xs">
                                    {a.name}{av != null ? ` — ${eur(av)}` : ""}{a.stock_status === "on_request" ? " (por encomenda)" : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <div className="text-right shrink-0 w-24">
                            {pv != null && <p className="text-sm font-semibold">{eur(pv)}</p>}
                            {p?.purchase_price != null && (
                              <p className="text-[10px] text-amber-600">Custo: {Number(p.purchase_price).toFixed(2)}€</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {result && (
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              {selected} linha{selected !== 1 ? "s" : ""} · produtos {eur(total)} c/ IVA
            </p>
            <Button onClick={confirm} disabled={selected === 0}>Adicionar ao orçamento</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
