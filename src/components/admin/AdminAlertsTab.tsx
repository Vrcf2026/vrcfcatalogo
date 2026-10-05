import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, SearchX, TrendingDown, ArrowUpDown, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Gap = { query: string; searches: number; last_seen: string; max_results: number; ai_used: boolean };
type Alert = {
  kind: "margem" | "preco" | "custo";
  product_id: string | null; name: string; sku: string | null; fornecedor: string | null;
  price: number | null; purchase_price: number | null; margin_pct: number | null;
  old_value: number | null; new_value: number | null; change_pct: number | null; changed_at: string;
};

const eur = (v: number | null | undefined) => (v != null ? `${Number(v).toFixed(2).replace(".", ",")} €` : "—");
const date = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });

const migrationHint = "Funcionalidade disponível depois de aplicar a migração 20261006090000.";

export default function AdminAlertsTab({ onEditProduct }: { onEditProduct?: (p: any) => void }) {
  const [gapDays, setGapDays] = useState("30");
  const [gapMax, setGapMax] = useState("0");
  const [minMargin, setMinMargin] = useState("5");

  const gaps = useQuery({
    queryKey: ["admin-search-gaps", gapDays, gapMax],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_search_gaps", { p_days: Number(gapDays), p_max_results: Number(gapMax) });
      if (error) throw error;
      return (data ?? []) as Gap[];
    },
    retry: false,
    staleTime: 60_000,
  });

  const margin = Number(minMargin.replace(",", ".")) || 0;
  const alerts = useQuery({
    queryKey: ["admin-price-alerts", margin],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_price_alerts", { p_min_margin: margin, p_change_pct: 30, p_days: 7 });
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
    retry: false,
    staleTime: 60_000,
  });

  const openProduct = async (id: string | null) => {
    if (!id || !onEditProduct) return;
    const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (error || !data) { toast.error("Produto não encontrado."); return; }
    onEditProduct(data);
  };

  const marginRows = (alerts.data ?? []).filter((a) => a.kind === "margem");
  const changeRows = (alerts.data ?? []).filter((a) => a.kind !== "margem");

  return (
    <div className="space-y-6">
      {/* ── Pesquisas sem resultados ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex flex-wrap items-center gap-2">
            <SearchX className="h-4 w-4 text-primary" /> O que os clientes procuram e não encontram
            <div className="ml-auto flex items-center gap-2">
              <Select value={gapMax} onValueChange={setGapMax}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-xs">Sem resultados</SelectItem>
                  <SelectItem value="3" className="text-xs">Até 3 resultados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={gapDays} onValueChange={setGapDays}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7" className="text-xs">Últimos 7 dias</SelectItem>
                  <SelectItem value="30" className="text-xs">Últimos 30 dias</SelectItem>
                  <SelectItem value="90" className="text-xs">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada linha é uma oportunidade: um produto a acrescentar ao catálogo ou um sinónimo que a pesquisa não apanha.
          </p>
        </CardHeader>
        <CardContent>
          {gaps.isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : gaps.isError ? (
            <p className="text-sm text-muted-foreground">{migrationHint}</p>
          ) : !gaps.data?.length ? (
            <p className="text-sm text-muted-foreground">Nada a assinalar neste período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-medium">Pesquisa</th>
                    <th className="py-2 pr-3 font-medium text-right">Vezes</th>
                    <th className="py-2 pr-3 font-medium text-right">Resultados</th>
                    <th className="py-2 font-medium text-right">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.data.map((g) => (
                    <tr key={g.query} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-3">
                        <Link to={`/pesquisa?q=${encodeURIComponent(g.query)}`} target="_blank" className="hover:underline">{g.query}</Link>
                        {g.ai_used && <Sparkles className="inline h-3 w-3 ml-1.5 text-primary" aria-label="Interpretada pela IA" />}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{g.searches}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{g.max_results}</td>
                      <td className="py-1.5 text-right text-muted-foreground tabular-nums">{date(g.last_seen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Margem baixa ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex flex-wrap items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" /> Produtos com margem baixa
            <div className="ml-auto flex items-center gap-2 text-xs font-normal">
              <span className="text-muted-foreground">Abaixo de</span>
              <Input value={minMargin} onChange={(e) => setMinMargin(e.target.value)} className="h-8 w-16 text-xs" inputMode="decimal" />
              <span className="text-muted-foreground">%</span>
            </div>
          </CardTitle>
          <p className="text-xs text-muted-foreground">Produtos à venda cujo preço ficou demasiado perto (ou abaixo) do custo. Preços sem IVA.</p>
        </CardHeader>
        <CardContent>
          {alerts.isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : alerts.isError ? (
            <p className="text-sm text-muted-foreground">{migrationHint}</p>
          ) : !marginRows.length ? (
            <p className="text-sm text-muted-foreground">Nenhum produto abaixo da margem mínima.</p>
          ) : (
            <AlertTable rows={marginRows} onOpen={openProduct} mode="margem" />
          )}
        </CardContent>
      </Card>

      {/* ── Variações bruscas ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-amber-600" /> Variações bruscas nos últimos 7 dias
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Preço ou custo que mudou 30% ou mais numa importação. Normalmente é promoção ou erro do fornecedor — vale a pena confirmar.
          </p>
        </CardHeader>
        <CardContent>
          {alerts.isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : alerts.isError ? (
            <p className="text-sm text-muted-foreground">{migrationHint}</p>
          ) : !changeRows.length ? (
            <p className="text-sm text-muted-foreground">Sem variações bruscas.</p>
          ) : (
            <AlertTable rows={changeRows} onOpen={openProduct} mode="variacao" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AlertTable({ rows, onOpen, mode }: { rows: Alert[]; onOpen: (id: string | null) => void; mode: "margem" | "variacao" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b">
            <th className="py-2 pr-3 font-medium">Produto</th>
            {mode === "variacao" && <th className="py-2 pr-3 font-medium">Mudou</th>}
            {mode === "variacao" && <th className="py-2 pr-3 font-medium text-right">Antes → depois</th>}
            <th className="py-2 pr-3 font-medium text-right">Preço</th>
            <th className="py-2 pr-3 font-medium text-right">Custo</th>
            <th className="py-2 pr-3 font-medium text-right">Margem</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={`${a.product_id ?? a.sku}-${i}`} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 pr-3 max-w-[22rem]">
                <p className="truncate">{a.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{a.sku}{a.fornecedor ? ` · ${a.fornecedor}` : ""}</p>
              </td>
              {mode === "variacao" && <td className="py-1.5 pr-3 text-xs">{a.kind === "preco" ? "Preço" : "Custo"} · {date(a.changed_at)}</td>}
              {mode === "variacao" && (
                <td className="py-1.5 pr-3 text-right tabular-nums text-xs">
                  {eur(a.old_value)} → {eur(a.new_value)} <span className="text-muted-foreground">({a.change_pct}%)</span>
                </td>
              )}
              <td className="py-1.5 pr-3 text-right tabular-nums">{eur(a.price)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{eur(a.purchase_price)}</td>
              <td className={`py-1.5 pr-3 text-right tabular-nums ${a.margin_pct != null && a.margin_pct < 0 ? "text-destructive font-semibold" : ""}`}>
                {a.margin_pct != null ? `${String(a.margin_pct).replace(".", ",")}%` : "—"}
              </td>
              <td className="py-1.5 text-right">
                {a.product_id && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpen(a.product_id)} aria-label="Editar produto">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
