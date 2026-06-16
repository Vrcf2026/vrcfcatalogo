import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, Package, ImageOff, Star, MousePointerClick, ShoppingCart,
  Trash2, CalendarDays, RefreshCw, TrendingUp, Globe, Tag, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const FORNECEDORES_DASH = ["diginova", "visiotech", "bydemes", "allto", "manual"];

const MUNDO_LABEL: Record<string, string> = {
  seguranca: "Segurança", escritorio: "Escritório", economato: "Economato",
};
const MUNDO_COLOR: Record<string, string> = {
  seguranca:  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  escritorio: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  economato:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: number | string; color?: string; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <Icon className={`h-4 w-4 flex-shrink-0 ${color || "text-primary"}`} />
        <div className="min-w-0">
          <p className="text-xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// Ranking limpo: número ordinal + nome com contexto + contagem simples.
// Sem barras de progresso (inúteis quando todos têm contagem igual).
function RankingList({ items, emptyText }: {
  items: Array<{
    id?: string; name: string; category?: string; brand?: string;
    mundo?: string; stock_status?: string; count: number;
  }>;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-1.5 mt-2">
      {items.map((item, i) => (
        <div key={item.id ?? item.name} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-secondary/40 transition-colors">
          <span className="text-xs font-bold text-muted-foreground w-5 text-right pt-0.5 flex-shrink-0">
            {i + 1}.
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium truncate">{item.name}</p>
              {item.stock_status === "out" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
                  sem stock
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {item.mundo && (
                <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${MUNDO_COLOR[item.mundo] ?? "bg-muted text-muted-foreground"}`}>
                  {MUNDO_LABEL[item.mundo] ?? item.mundo}
                </span>
              )}
              {item.category && (
                <span className="text-[11px] text-muted-foreground truncate">{item.category}</span>
              )}
              {item.brand && (
                <span className="text-[11px] text-muted-foreground/70 truncate">· {item.brand}</span>
              )}
            </div>
            {/* Barra só aparece quando há variação real (max > 1 e não todos iguais) */}
            {max > 1 && (
              <div className="h-1 rounded-full bg-muted mt-1.5">
                <div
                  className="h-1 rounded-full bg-primary/50 transition-all"
                  style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }}
                />
              </div>
            )}
          </div>
          <span className="text-sm font-bold tabular-nums text-foreground flex-shrink-0 pt-0.5">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryRanking({ data }: { data: any[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground text-center py-6">Sem dados</p>;
  const max = Math.max(...data.map((d) => Number(d.count)), 1);
  return (
    <div className="space-y-1.5 mt-2">
      {data.map((d, i) => (
        <div key={`${d.categoria}-${d.mundo}`} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/40">
          <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium">{d.category ?? d.categoria ?? "—"}</span>
              {d.mundo && (
                <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${MUNDO_COLOR[d.mundo] ?? "bg-muted text-muted-foreground"}`}>
                  {MUNDO_LABEL[d.mundo] ?? d.mundo}
                </span>
              )}
            </div>
            {max > 1 && (
              <div className="h-1 rounded-full bg-muted mt-1.5">
                <div className="h-1 rounded-full bg-primary/50 transition-all" style={{ width: `${Math.max((Number(d.count) / max) * 100, 4)}%` }} />
              </div>
            )}
          </div>
          <span className="text-sm font-bold tabular-nums flex-shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard(_props = {}) {
  const [dateRange, setDateRange] = useState("all");
  const [clearing, setClearing] = useState(false);
  const queryClient = useQueryClient();

  const since = (() => {
    const now = new Date();
    if (dateRange === "7d")  return new Date(now.getTime() -  7 * 86400000).toISOString();
    if (dateRange === "30d") return new Date(now.getTime() - 30 * 86400000).toISOString();
    if (dateRange === "90d") return new Date(now.getTime() - 90 * 86400000).toISOString();
    return null;
  })();

  // ── Stats gerais (server-side counts) ────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const countOf = async (build: (q: any) => any) => {
        const { count, error } = await build(
          supabase.from("products").select("id", { count: "exact", head: true })
        );
        if (error) throw error;
        return count ?? 0;
      };
      const [total, noCatalog, featured, semImagem, porFornecedor] = await Promise.all([
        countOf((q) => q),
        countOf((q) => q.eq("include_in_catalog", true)),
        countOf((q) => q.eq("featured", true)),
        countOf((q) => q.is("image_url", null)),
        Promise.all(FORNECEDORES_DASH.map(async (f) => {
          const [tot, semStock] = await Promise.all([
            countOf((q) => q.eq("fornecedor", f)),
            countOf((q) => q.eq("fornecedor", f).eq("stock_status", "out")),
          ]);
          return [f, { total: tot, comStock: tot - semStock, semStock }] as const;
        })),
      ]);
      return {
        total, noCatalog, featured, semImagem,
        porFornecedor: Object.fromEntries(porFornecedor.filter(([, s]) => s.total > 0)),
      };
    },
    staleTime: 60 * 1000,
  });

  // ── Analytics: top produtos clicados e orçamentados (com contexto) ──
  const { data: topClicks = [] } = useQuery({
    queryKey: ["analytics-top-clicks", since],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_top_products_with_context", {
        p_event_type: "click", p_since: since, p_limit: 10,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, id: r.product_id, count: Number(r.count) }));
    },
    staleTime: 60 * 1000,
  });

  const { data: topQuotes = [] } = useQuery({
    queryKey: ["analytics-top-quotes", since],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_top_products_with_context", {
        p_event_type: "quote", p_since: since, p_limit: 10,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, id: r.product_id, count: Number(r.count) }));
    },
    staleTime: 60 * 1000,
  });

  // ── Analytics por categoria ──────────────────────────────────────────
  const { data: catClicks = [] } = useQuery({
    queryKey: ["analytics-cat-clicks", since],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_analytics_by_category", {
        p_event_type: "click", p_since: since, p_limit: 10,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, count: Number(r.count) }));
    },
    staleTime: 60 * 1000,
  });

  // ── Analytics por marca ──────────────────────────────────────────────
  const { data: brandClicks = [] } = useQuery({
    queryKey: ["analytics-brand-clicks", since],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_analytics_by_brand", {
        p_event_type: "click", p_since: since, p_limit: 10,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, count: Number(r.count) }));
    },
    staleTime: 60 * 1000,
  });

  // ── Analytics por mundo ──────────────────────────────────────────────
  const { data: mundoStats = [] } = useQuery({
    queryKey: ["analytics-mundo", since],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_analytics_by_mundo", { p_since: since });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, clicks: Number(r.clicks), quotes: Number(r.quotes) }));
    },
    staleTime: 60 * 1000,
  });

  // ── Produtos sem stock mais clicados (oportunidades) ─────────────────
  const { data: outOfStockHits = [] } = useQuery({
    queryKey: ["analytics-out-of-stock", since],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_out_of_stock_clicked", {
        p_since: since, p_limit: 10,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, id: r.product_id, count: Number(r.count) }));
    },
    staleTime: 60 * 1000,
  });

  // ── Totais de cliques/orçamentos (rápido via analytics existente) ────
  const { data: totalsAnalytics } = useQuery({
    queryKey: ["analytics-totals", since],
    queryFn: async () => {
      let q = (supabase as any).from("product_analytics")
        .select("event_type", { count: "exact" });
      if (since) q = q.gte("created_at", since);
      const [clicks, quotes] = await Promise.all([
        (supabase as any).from("product_analytics").select("id", { count: "exact", head: true })
          .eq("event_type", "click").then(({ count }: any) => count ?? 0),
        (supabase as any).from("product_analytics").select("id", { count: "exact", head: true })
          .eq("event_type", "quote").then(({ count }: any) => count ?? 0),
      ]);
      return { clicks, quotes };
    },
    staleTime: 60 * 1000,
  });

  const handleClearAnalytics = async () => {
    if (!confirm("Limpar todos os dados de analytics? Esta acção é irreversível.")) return;
    setClearing(true);
    try {
      const { error } = await (supabase as any).from("product_analytics")
        .delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Analytics limpos");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setClearing(false);
    }
  };

  const total      = stats?.total ?? 0;
  const noCatalog  = stats?.noCatalog ?? 0;
  const featured   = stats?.featured ?? 0;
  const semImagem  = stats?.semImagem ?? 0;
  const porFornecedor = stats?.porFornecedor ?? {};

  return (
    <div className="space-y-5">
      {/* ── Cards gerais ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Package}          label="Total produtos"  value={total}      />
        <StatCard icon={BarChart3}         label="No catálogo"     value={noCatalog}  />
        <StatCard icon={Star}             label="Destaques"       value={featured}   color="text-amber-500" />
        <StatCard icon={ImageOff}         label="Sem imagem"      value={semImagem}  color={semImagem > 0 ? "text-orange-500" : undefined} />
        <StatCard icon={MousePointerClick} label="Cliques"         value={totalsAnalytics?.clicks ?? "—"} color="text-blue-500" />
        <StatCard icon={ShoppingCart}     label="Orçamentados"   value={totalsAnalytics?.quotes ?? "—"} color="text-green-500" />
      </div>

      {/* ── Por fornecedor ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(porFornecedor).map(([f, s]: any) => (
          <Card key={f}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="capitalize text-xs">{f}</Badge>
                <span className="text-lg font-bold">{s.total}</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="text-green-600">✓ {s.comStock} c/stock</span>
                {s.semStock > 0 && <span className="text-red-500">✗ {s.semStock}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Por mundo ─────────────────────────────────────────────── */}
      {mundoStats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {mundoStats.map((m: any) => (
            <Card key={m.mundo}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MUNDO_COLOR[m.mundo] ?? "bg-muted text-muted-foreground"}`}>
                    {MUNDO_LABEL[m.mundo] ?? m.mundo}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {m.clicks}</span>
                  <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {m.quotes}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Filtro temporal + limpar ──────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(v) => { setDateRange(v); }}>
            <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleClearAnalytics} disabled={clearing}
          className="gap-1.5 h-8 text-destructive border-destructive/30 hover:bg-destructive/10">
          {clearing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Limpar analytics
        </Button>
      </div>

      {/* ── Rankings e análises ───────────────────────────────────── */}
      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="produtos"     className="gap-1.5 text-xs"><TrendingUp className="h-3 w-3" /> Produtos</TabsTrigger>
          <TabsTrigger value="categorias"   className="gap-1.5 text-xs"><Tag className="h-3 w-3" /> Categorias</TabsTrigger>
          <TabsTrigger value="marcas"       className="gap-1.5 text-xs"><BarChart3 className="h-3 w-3" /> Marcas</TabsTrigger>
          <TabsTrigger value="oportunidades" className="gap-1.5 text-xs"><Zap className="h-3 w-3 text-amber-500" /> Oportunidades</TabsTrigger>
        </TabsList>

        {/* Produtos — top clicados e orçamentados */}
        <TabsContent value="produtos">
          <div className="grid md:grid-cols-2 gap-4 mt-3">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-blue-500" /> Mais Clicados
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <RankingList items={topClicks} emptyText="Sem dados de cliques" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-green-500" /> Mais Orçamentados
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <RankingList items={topQuotes} emptyText="Sem dados de orçamentos" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categorias */}
        <TabsContent value="categorias">
          <Card className="mt-3">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" /> Categorias mais clicadas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <CategoryRanking data={catClicks} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marcas */}
        <TabsContent value="marcas">
          <Card className="mt-3">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Marcas mais clicadas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="space-y-1.5 mt-2">
                {brandClicks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem dados</p>
                ) : brandClicks.map((b: any, i: number) => {
                  const max = Math.max(...brandClicks.map((x: any) => Number(x.count)), 1);
                  return (
                    <div key={b.brand} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/40">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{b.brand}</p>
                        {max > 1 && (
                          <div className="h-1 rounded-full bg-muted mt-1.5">
                            <div className="h-1 rounded-full bg-primary/50" style={{ width: `${Math.max((Number(b.count) / max) * 100, 4)}%` }} />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold tabular-nums flex-shrink-0">{b.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oportunidades — produtos sem stock mais clicados */}
        <TabsContent value="oportunidades">
          <Card className="mt-3">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Produtos sem stock com mais interesse
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Produtos com <strong>stock esgotado</strong> que os clientes continuam a clicar — potencial de encomenda ou restock.
              </p>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <RankingList items={outOfStockHits} emptyText="Nenhum produto sem stock foi clicado no período seleccionado." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
