import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Package, ImageOff, Star, MousePointerClick, ShoppingCart, Eye, Trash2, CalendarDays, Truck, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AdminDashboardProps {}

const FORNECEDORES_DASH = ["diginova", "visiotech", "bydemes", "manual"];

export function AdminDashboard(_props: AdminDashboardProps = {}) {
  const [dateRange, setDateRange] = useState("all");
  const [clearing, setClearing] = useState(false);
  const queryClient = useQueryClient();

  const dateFilter = (() => {
    const now = new Date();
    if (dateRange === "7d") return new Date(now.getTime() - 7 * 86400000).toISOString();
    if (dateRange === "30d") return new Date(now.getTime() - 30 * 86400000).toISOString();
    if (dateRange === "90d") return new Date(now.getTime() - 90 * 86400000).toISOString();
    return null;
  })();

  const { data: analytics = [] } = useQuery({
    queryKey: ["product_analytics", dateRange],
    queryFn: async () => {
      let query = (supabase as any)
        .from("product_analytics")
        .select("product_id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (dateFilter) query = query.gte("created_at", dateFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as { product_id: string; event_type: string; created_at: string }[];
    },
  });

  const handleClearAnalytics = async () => {
    if (!confirm("Limpar todos os dados de analytics? Esta acção é irreversível.")) return;
    setClearing(true);
    try {
      const { error } = await (supabase as any).from("product_analytics").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["product_analytics"] });
      toast.success("Analytics limpos");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setClearing(false);
    }
  };

  // Stats gerais — contagens feitas no servidor (head:true não transfere
  // linhas), em vez de carregar os 27000+ produtos para o browser.
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const countOf = async (build: (q: any) => any) => {
        let q = supabase.from("products").select("id", { count: "exact", head: true });
        q = build(q);
        const { count, error } = await q;
        if (error) throw error;
        return count ?? 0;
      };

      const [total, noCatalog, featured, semImagem, porFornecedor] = await Promise.all([
        countOf((q) => q),
        countOf((q) => q.eq("include_in_catalog", true)),
        countOf((q) => q.eq("featured", true)),
        countOf((q) => q.is("image_url", null)),
        Promise.all(FORNECEDORES_DASH.map(async (f) => {
          const [total, semStock] = await Promise.all([
            countOf((q) => q.eq("fornecedor", f)),
            countOf((q) => q.eq("fornecedor", f).eq("stock_status", "out")),
          ]);
          return [f, { total, comStock: total - semStock, semStock }] as const;
        })),
      ]);

      return {
        total, noCatalog, featured, semImagem,
        porFornecedor: Object.fromEntries(porFornecedor.filter(([, s]) => s.total > 0)),
      };
    },
    staleTime: 60 * 1000,
  });

  const total = stats?.total ?? 0;
  const noCatalog = stats?.noCatalog ?? 0;
  const featured = stats?.featured ?? 0;
  const semImagem = stats?.semImagem ?? 0;
  const porFornecedor = stats?.porFornecedor ?? {};

  // Analytics
  const clickCounts: Record<string, number> = {};
  const quoteCounts: Record<string, number> = {};
  const viewCounts: Record<string, number> = {};
  analytics.forEach(e => {
    if (e.event_type === "click") clickCounts[e.product_id] = (clickCounts[e.product_id] || 0) + 1;
    if (e.event_type === "quote") quoteCounts[e.product_id] = (quoteCounts[e.product_id] || 0) + 1;
    if (e.event_type === "catalog_view") viewCounts[e.product_id] = (viewCounts[e.product_id] || 0) + 1;
  });

  const topClicked = Object.entries(clickCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topQuoted = Object.entries(quoteCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const totalClicks = analytics.filter(e => e.event_type === "click").length;
  const totalQuotes = analytics.filter(e => e.event_type === "quote").length;

  // Nomes dos produtos nos rankings — só os ~20 IDs necessários, não os
  // 27000 produtos. Serializado para evitar recomputar/refetch a cada
  // render (topClicked/topQuoted são arrays novos sempre que analytics
  // muda de referência, mas o conteúdo é normalmente o mesmo).
  const rankingIdsKey = useMemo(() => {
    const ids = new Set<string>();
    topClicked.forEach(([id]) => ids.add(id));
    topQuoted.forEach(([id]) => ids.add(id));
    return Array.from(ids).sort().join(",");
  }, [topClicked, topQuoted]);

  const rankingIds = useMemo(() => rankingIdsKey ? rankingIdsKey.split(",") : [], [rankingIdsKey]);

  const { data: rankingNames = {} } = useQuery({
    queryKey: ["admin-dashboard-ranking-names", rankingIdsKey],
    queryFn: async () => {
      if (rankingIds.length === 0) return {};
      const { data, error } = await supabase.from("products").select("id,name").in("id", rankingIds);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((p: any) => [p.id, p.name]));
    },
    enabled: rankingIds.length > 0,
  });

  const productName = (id: string) => rankingNames[id] || "Produto removido";

  return (
    <div className="space-y-4">
      {/* Cards gerais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Package} label="Total" value={total} />
        <StatCard icon={BarChart3} label="No Catálogo" value={noCatalog} />
        <StatCard icon={Star} label="Destaques" value={featured} color="text-amber-500" />
        <StatCard icon={ImageOff} label="Sem Imagem" value={semImagem} color={semImagem > 0 ? "text-orange-500" : undefined} />
        <StatCard icon={MousePointerClick} label="Cliques" value={totalClicks} color="text-blue-500" />
        <StatCard icon={ShoppingCart} label="Orçamentos" value={totalQuotes} color="text-green-500" />
      </div>

      {/* Por fornecedor */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(porFornecedor).map(([f, fStats]) => (
          <Card key={f}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="capitalize text-xs">{f}</Badge>
                <span className="text-lg font-bold">{(fStats as any).total}</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="text-green-600">✓ {(fStats as any).comStock}</span>
                {(fStats as any).semStock > 0 && <span className="text-red-500">✗ {(fStats as any).semStock}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleClearAnalytics} disabled={clearing} className="gap-1.5 h-8 text-destructive border-destructive/30 hover:bg-destructive/10">
          {clearing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Limpar Analytics
        </Button>
      </div>

      <Tabs defaultValue="clicks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="clicks" className="gap-1.5 text-xs">
            <MousePointerClick className="h-3 w-3" /> Cliques
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1.5 text-xs">
            <ShoppingCart className="h-3 w-3" /> Orçamentos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clicks">
          <RankingList items={topClicked} productName={productName} emptyText="Sem dados de cliques" />
        </TabsContent>
        <TabsContent value="quotes">
          <RankingList items={topQuoted} productName={productName} emptyText="Sem dados de orçamentos" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <Icon className={`h-4 w-4 flex-shrink-0 ${color || "text-primary"}`} />
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RankingList({ items, productName, emptyText }: { items: [string, number][]; productName: (id: string) => string; emptyText: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>;
  const max = items[0]?.[1] || 1;
  return (
    <div className="space-y-2 mt-3">
      {items.map(([id, count], i) => (
        <div key={id} className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{productName(id)}</p>
            <div className="h-1 rounded-full bg-muted mt-1">
              <div className="h-1 rounded-full bg-primary/60 transition-all" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  );
}
