import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Package, ImageOff, Star, TrendingUp, MousePointerClick, ShoppingCart, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminDashboardProps {
  products: any[];
  productImages: any[];
  categories: string[];
  brands: { id: string; name: string }[];
}

export function AdminDashboard({ products, productImages, categories, brands }: AdminDashboardProps) {
  const { data: analytics = [] } = useQuery({
    queryKey: ["product_analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_analytics")
        .select("product_id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as { product_id: string; event_type: string; created_at: string }[];
    },
  });

  // Stats
  const totalProducts = products.length;
  const catalogProducts = products.filter((p) => p.include_in_catalog).length;
  const featuredProducts = products.filter((p) => p.featured).length;
  const productsWithoutImage = products.filter((p) => !p.image_url).length;
  
  // Images per product
  const imageCount: Record<string, number> = {};
  productImages.forEach((img) => {
    imageCount[img.product_id] = (imageCount[img.product_id] || 0) + 1;
  });
  const productsIncomplete = products.filter((p) => (imageCount[p.id] || 0) < 3).length;

  // By category
  const byCategory: Record<string, number> = {};
  products.forEach((p) => {
    const cat = p.category || "Sem categoria";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  // By brand
  const byBrand: Record<string, number> = {};
  const brandNameMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  products.forEach((p) => {
    if (p.brand_id) {
      const name = brandNameMap[p.brand_id] || "Desconhecida";
      byBrand[name] = (byBrand[name] || 0) + 1;
    }
  });

  // Analytics aggregation
  const clickCounts: Record<string, number> = {};
  const quoteCounts: Record<string, number> = {};
  const viewCounts: Record<string, number> = {};

  analytics.forEach((e) => {
    if (e.event_type === "click") clickCounts[e.product_id] = (clickCounts[e.product_id] || 0) + 1;
    if (e.event_type === "quote") quoteCounts[e.product_id] = (quoteCounts[e.product_id] || 0) + 1;
    if (e.event_type === "catalog_view") viewCounts[e.product_id] = (viewCounts[e.product_id] || 0) + 1;
  });

  const productName = (id: string) => products.find((p) => p.id === id)?.name || "Produto removido";

  const topClicked = Object.entries(clickCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topQuoted = Object.entries(quoteCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topViewed = Object.entries(viewCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const totalClicks = analytics.filter((e) => e.event_type === "click").length;
  const totalQuotes = analytics.filter((e) => e.event_type === "quote").length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Package} label="Total Produtos" value={totalProducts} />
        <StatCard icon={Star} label="Destaques" value={featuredProducts} />
        <StatCard icon={BarChart3} label="No Catálogo" value={catalogProducts} />
        <StatCard icon={ImageOff} label="Sem Imagem" value={productsWithoutImage} color="text-orange-500" />
        <StatCard icon={MousePointerClick} label="Total Cliques" value={totalClicks} color="text-blue-500" />
        <StatCard icon={ShoppingCart} label="Total Orçamentos" value={totalQuotes} color="text-green-500" />
      </div>

      {/* Analytics tabs */}
      <Tabs defaultValue="clicks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="clicks" className="gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" /> Cliques
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Orçamentos
          </TabsTrigger>
          <TabsTrigger value="views" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Catálogo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clicks">
          <RankingList items={topClicked} productName={productName} emptyText="Sem dados de cliques ainda" />
        </TabsContent>
        <TabsContent value="quotes">
          <RankingList items={topQuoted} productName={productName} emptyText="Sem dados de orçamentos ainda" />
        </TabsContent>
        <TabsContent value="views">
          <RankingList items={topViewed} productName={productName} emptyText="Sem dados de visualizações ainda" />
        </TabsContent>
      </Tabs>

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionList items={byCategory} total={totalProducts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Por Marca</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byBrand).length > 0 ? (
              <DistributionList items={byBrand} total={Object.values(byBrand).reduce((a, b) => a + b, 0)} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto com marca atribuída</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${color || "text-primary"}`} />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RankingList({ items, productName, emptyText }: { items: [string, number][]; productName: (id: string) => string; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>;
  }
  const max = items[0]?.[1] || 1;
  return (
    <div className="space-y-2 mt-3">
      {items.map(([id, count], i) => (
        <div key={id} className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{productName(id)}</p>
            <div className="h-1.5 rounded-full bg-muted mt-1">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold text-foreground tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  );
}

function DistributionList({ items, total }: { items: Record<string, number>; total: number }) {
  const sorted = Object.entries(items).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2">
      {sorted.map(([name, count]) => (
        <div key={name} className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground truncate">{name}</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary/60" style={{ width: `${(count / total) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
