import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Loader2, Package, ChevronLeft, ChevronRight, ShoppingCart, ArrowLeft,
  Search, LayoutGrid, ShieldCheck, Monitor, SlidersHorizontal, X, ShoppingBag, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import BrandsStrip from "@/components/BrandsStrip";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CartDrawer } from "@/components/CartDrawer";
import { UserMenuButton } from "@/components/UserMenuButton";
import { useCart } from "@/contexts/CartContext";
import { getCategoryMeta } from "@/lib/categoryIcons.tsx";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryTile } from "@/components/catalog/CategoryTile";
import { CatalogFilterPanel, type TechSpecGroup } from "@/components/catalog/CatalogFilterPanel";

type Mundo = "seguranca" | "escritorio" | "economato";
interface Props { mundo: Mundo; title: string; subtitle: string; }
const PAGE_SIZE = 24;

const WorldCatalog = ({ mundo, title, subtitle }: Props) => {
  const navigate = useNavigate();
  const { totalItems, setIsOpen } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("categoria") ?? "all");
  const [stockFilter, setStockFilter] = useState("all");
  const parseCsv = (v: string | null) => (v && v !== "all" ? v.split(",").filter(Boolean) : []);
  const [familyFilter, setFamilyFilter] = useState<string[]>(parseCsv(searchParams.get("familia")));
  const [typeFilter, setTypeFilter] = useState<string[]>(parseCsv(searchParams.get("tipo")));
  const [brandFilter, setBrandFilter] = useState<string[]>(parseCsv(searchParams.get("marca")));
  const [bannerIdx, setBannerIdx] = useState(0);

  const { data: banners = [] } = useQuery({
    queryKey: ["world-banners", mundo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("ativo", true)
        .in("mundo", [mundo, "todos"])
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const [sortBy, setSortBy] = useState("featured");
  const [techFilters, setTechFilters] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sincronizar filtros vindos da URL (categoria, familia, tipo, marca)
  useEffect(() => {
    const categoria = searchParams.get("categoria") ?? "all";
    const familiaArr = parseCsv(searchParams.get("familia"));
    const tipoArr = parseCsv(searchParams.get("tipo"));
    const marcaArr = parseCsv(searchParams.get("marca"));
    let changed = false;
    if (JSON.stringify(marcaArr) !== JSON.stringify(brandFilter)) { setBrandFilter(marcaArr); changed = true; }
    if (categoria !== categoryFilter) { setCategoryFilter(categoria); changed = true; }
    if (JSON.stringify(familiaArr) !== JSON.stringify(familyFilter)) { setFamilyFilter(familiaArr); changed = true; }
    if (JSON.stringify(tipoArr) !== JSON.stringify(typeFilter)) { setTypeFilter(tipoArr); changed = true; }
    if (changed) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const submitGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalQuery.trim();
    if (!q) return;
    navigate(`/pesquisa?q=${encodeURIComponent(q)}`);
  };

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", mundo],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*")
        .in("mundo", [mundo, "todos"]).eq("visivel", true).order("ordem");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Families
  const { data: families = [] } = useQuery({
    queryKey: ["families", mundo],
    queryFn: async () => {
      const { data } = await supabase.from("product_families").select("*")
        .in("mundo", [mundo, "todos"]).order("name");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Brands
  const { data: brands = [] } = useQuery({
    queryKey: ["brands", mundo],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("*")
        .in("mundo", [mundo, "todos"]).order("name");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Tipos (Nível 3 — dependentes de uma família)
  const { data: types = [] } = useQuery({
    queryKey: ["types", mundo],
    queryFn: async () => {
      const { data } = await supabase.from("product_types").select("*")
        .in("mundo", [mundo, "todos"]).order("name");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Products query
  const productsQuery = useQuery({
    queryKey: ["products", mundo, search, categoryFilter, stockFilter, familyFilter, typeFilter, brandFilter, sortBy, page, techFilters],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;

      // Quando há pesquisa por texto e nenhum filtro técnico (specs)
      // activo, usa search_products: pesquisa "todas as palavras, em
      // qualquer ordem" e insensível a acentos — "camara ip" encontra
      // "Câmara IP Bullet 4MP". search_products não cobre filtros JSONB
      // de especificações, por isso com techFilters activos mantém-se o
      // .ilike() abaixo (sem normalização de acentos nesse caso).
      // search_products RPC só suporta single id por axis. Usa-o apenas se
      // família/tipo/marca tiverem 0 ou 1 selecção.
      const canUseRpc = search
        && Object.keys(techFilters).length === 0
        && familyFilter.length <= 1
        && typeFilter.length <= 1
        && brandFilter.length <= 1;

      if (canUseRpc) {
        const orderMap: Record<string, { by: string; asc: boolean }> = {
          "featured":   { by: "featured",   asc: false },
          "price-asc":  { by: "price",      asc: true },
          "price-desc": { by: "price",      asc: false },
          "name-asc":   { by: "name",       asc: true },
          "name-desc":  { by: "name",       asc: false },
          "newest":     { by: "created_at", asc: false },
        };
        const order = orderMap[sortBy] ?? orderMap.featured;
        const singleBrandId = brandFilter[0] ?? null;
        const brandName = singleBrandId ? (brands.find((b: any) => b.id === singleBrandId)?.name ?? null) : null;

        const { data, error } = await supabase.rpc("search_products", {
          p_query: search,
          p_mundo: mundo,
          p_category: categoryFilter !== "all" ? categoryFilter : null,
          p_family_id: familyFilter[0] ?? null,
          p_type_id: typeFilter[0] ?? null,
          p_brand_id: singleBrandId,
          p_brand: brandName,
          p_limit: PAGE_SIZE,
          p_offset: from,
          p_order_by: order.by,
          p_order_asc: order.asc,
        });
        if (error) throw error;
        const rows = (data ?? []).map((r: any) => r.row_data);
        const count = data && data.length > 0 ? Number(data[0].total_count) : 0;
        return { data: rows, count };
      }

      let q = supabase.from("products").select("*", { count: "exact" })
        .eq("mundo", mundo)
        .eq("include_in_catalog", true);

      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (stockFilter !== "all") {
        if (stockFilter === "in_stock") q = q.in("stock_status", ["high", "low"]);
        else if (stockFilter === "low") q = q.eq("stock_status", "low");
        else if (stockFilter === "out") q = q.in("stock_status", ["out", "on_request"]);
      }
      if (familyFilter.length > 0) q = q.in("family_id", familyFilter);
      if (typeFilter.length > 0) q = q.in("type_id", typeFilter);
      if (brandFilter.length > 0) {
        const brandNames = brandFilter.map(id => brands.find((b: any) => b.id === id)?.name ?? "").filter(Boolean);
        const brandConds = brandFilter.map(id => `brand_id.eq.${id}`).concat(brandNames.map(n => `brand.eq.${n}`)).join(",");
        if (brandConds) q = q.or(brandConds);
      }

      // Filtros técnicos (specs) — aplicados no servidor sobre o JSONB
      // "especificacoes", para que a contagem/paginação considere TODOS os
      // produtos correspondentes, não só os da página actual.
      // Usa .filter() com o operador "->>" do PostgREST explicitamente —
      // .eq("col->>key", v) pode não ser codificado correctamente em
      // todas as versões do supabase-js.
      // Filtros técnicos multi-select:
      // Dentro de cada chave → OR (ex: resolucao=4MP OR 8MP)
      // Entre chaves → AND (ex: resolucao=4MP AND protocolo=ONVIF)
      for (const [key, values] of Object.entries(techFilters)) {
        if (!values || values.length === 0) continue;
        if (values.length === 1) {
          q = q.filter(`especificacoes->>${key}`, "eq", values[0]);
        } else {
          // PostgREST: usar .in() sobre jsonb extract
          const orConds = values.map(v => `especificacoes->>${key}.eq.${v}`).join(",");
          q = q.or(orConds);
        }
      }

      if (sortBy === "featured") q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
      else if (sortBy === "price-asc") q = q.order("price", { ascending: true, nullsFirst: false });
      else if (sortBy === "price-desc") q = q.order("price", { ascending: false, nullsFirst: false });
      else if (sortBy === "name-asc") q = q.order("name", { ascending: true });
      else if (sortBy === "name-desc") q = q.order("name", { ascending: false });
      else if (sortBy === "newest") q = q.order("created_at", { ascending: false });

      q = q.range(from, from + PAGE_SIZE - 1);


      const { data, count, error } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  const products = productsQuery.data?.data ?? [];
  const total = productsQuery.data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Specs via RPC no servidor — agrega TODOS os produtos da categoria/família
  // sem trazer JSONB para o browser. Sem limites artificiais de valores ou grupos.
  const specsRpcQuery = useQuery({
    queryKey: ["products-specs-rpc", mundo, categoryFilter, familyFilter, typeFilter, brandFilter, techFilters],
    queryFn: async () => {
      if (categoryFilter === "all") return [];
      const brandId = brandFilter.length === 1 ? brandFilter[0] : null;
      const brandName = brandId ? (brands.find((b: any) => b.id === brandId)?.name ?? null) : null;
      const brandNames = brandFilter
        .map(id => brands.find((b: any) => b.id === id)?.name ?? "")
        .filter(Boolean);
      const { data, error } = await (supabase as any).rpc("get_specs_aggregation", {
        p_mundo: mundo,
        p_category: categoryFilter !== "all" ? categoryFilter : null,
        p_family_id: familyFilter.length === 1 ? familyFilter[0] : null,
        p_brand_id: brandId,
        p_brand_name: brandName,
        p_tech_filters: techFilters,
        p_family_ids: familyFilter.length > 0 ? familyFilter : null,
        p_type_ids: typeFilter.length > 0 ? typeFilter : null,
        p_brand_ids: brandFilter.length > 0 ? brandFilter : null,
        p_brand_names: brandNames.length > 0 ? brandNames : null,
      });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: categoryFilter !== "all",
  });

  const techSpecOptions: TechSpecGroup[] = (specsRpcQuery.data ?? []).map((g: any) => ({
    key: g.key,
    label: g.label.charAt(0).toUpperCase() + g.label.slice(1),
    values: (g.values ?? []).map((v: any) => ({ value: v.value, count: v.count })),
  }));

  // Facets: contagens de família/tipo/marca dentro da categoria actual + search.
  const facetsQuery = useQuery({
    queryKey: ["facets", mundo, categoryFilter, search],
    queryFn: async () => {
      if (categoryFilter === "all") return [] as any[];
      let q = supabase.from("products")
        .select("family_id, type_id, brand_id, brand")
        .eq("mundo", mundo)
        .eq("include_in_catalog", true)
        .eq("category", categoryFilter)
        .range(0, 9999);
      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: categoryFilter !== "all",
  });

  const facetRows: any[] = (facetsQuery.data ?? []) as any[];

  const familyMap = Object.fromEntries(families.map((f: any) => [f.id, f.name]));
  const brandIdByName = Object.fromEntries(brands.map((b: any) => [b.name, b.id]));

  const familyCount = new Map<string, number>();
  const typeCount = new Map<string, number>();
  const brandCount = new Map<string, number>();
  for (const r of facetRows) {
    if (r.family_id) familyCount.set(r.family_id, (familyCount.get(r.family_id) ?? 0) + 1);
    if (r.type_id)   typeCount.set(r.type_id,     (typeCount.get(r.type_id)   ?? 0) + 1);
    const bId = r.brand_id ?? brandIdByName[r.brand];
    if (bId) brandCount.set(bId, (brandCount.get(bId) ?? 0) + 1);
  }

  const familyOptions = families
    .filter((f: any) => f.category === categoryFilter)
    .map((f: any) => ({ id: f.id, name: f.name, count: familyCount.get(f.id) ?? 0 }))
    .filter((o: any) => o.count > 0 || familyFilter.includes(o.id))
    .sort((a: any, b: any) => b.count - a.count || a.name.localeCompare(b.name));

  const allowedFamilyIds = familyFilter.length > 0
    ? new Set(familyFilter)
    : new Set(familyOptions.map((o: any) => o.id));
  const typeOptions = types
    .filter((t: any) => allowedFamilyIds.has(t.family_id))
    .map((t: any) => ({ id: t.id, name: t.name, count: typeCount.get(t.id) ?? 0 }))
    .filter((o: any) => o.count > 0 || typeFilter.includes(o.id))
    .sort((a: any, b: any) => b.count - a.count || a.name.localeCompare(b.name));

  const brandOptions = brands
    .map((b: any) => ({ id: b.id, name: b.name, count: brandCount.get(b.id) ?? 0 }))
    .filter((o: any) => o.count > 0 || brandFilter.includes(o.id))
    .sort((a: any, b: any) => b.count - a.count || a.name.localeCompare(b.name));

  const hasPrices = products.some((p: any) => p.price != null);
  const activeFiltersCount = [
    categoryFilter !== "all",
    familyFilter.length > 0,
    typeFilter.length > 0,
    brandFilter.length > 0,
    Object.keys(techFilters).length > 0,
    stockFilter !== "all",
  ].filter(Boolean).length;

  const csv = (arr: string[]) => arr.join(",");

  const setCategory = (name: string) => {
    setCategoryFilter(name); setFamilyFilter([]); setTypeFilter([]); setPage(1);
    if (name === "all") searchParams.delete("categoria"); else searchParams.set("categoria", name);
    searchParams.delete("familia"); searchParams.delete("tipo");
    setSearchParams(searchParams, { replace: true });
  };

  const setFamilies = (ids: string[]) => {
    setFamilyFilter(ids);
    const allowed = new Set(ids);
    const nextTypes = ids.length > 0
      ? typeFilter.filter(tid => {
          const t = types.find((x: any) => x.id === tid);
          return t && allowed.has(t.family_id);
        })
      : typeFilter;
    setTypeFilter(nextTypes);
    setPage(1);
    if (ids.length === 0) searchParams.delete("familia"); else searchParams.set("familia", csv(ids));
    if (nextTypes.length === 0) searchParams.delete("tipo"); else searchParams.set("tipo", csv(nextTypes));
    setSearchParams(searchParams, { replace: true });
  };

  const setTypes = (ids: string[]) => {
    setTypeFilter(ids); setPage(1);
    if (ids.length === 0) searchParams.delete("tipo"); else searchParams.set("tipo", csv(ids));
    setSearchParams(searchParams, { replace: true });
  };

  const setBrands = (ids: string[]) => {
    setBrandFilter(ids); setPage(1);
    if (ids.length === 0) searchParams.delete("marca"); else searchParams.set("marca", csv(ids));
    setSearchParams(searchParams, { replace: true });
  };

  const clearAllFilters = () => {
    setCategoryFilter("all"); setFamilyFilter([]); setTypeFilter([]); setBrandFilter([]);
    setTechFilters({}); setStockFilter("all"); setSearch(""); setSearchInput(""); setPage(1);
    searchParams.delete("categoria"); searchParams.delete("marca"); searchParams.delete("familia"); searchParams.delete("tipo");
    setSearchParams(searchParams, { replace: true });
  };

  const Icon = mundo === "seguranca" ? ShieldCheck : mundo === "economato" ? ShoppingBag : Monitor;

  const renderFilterPanel = () => (
    <CatalogFilterPanel
      familyOptions={familyOptions}
      typeOptions={typeOptions}
      brandOptions={brandOptions}
      familyFilter={familyFilter}
      typeFilter={typeFilter}
      brandFilter={brandFilter}
      stockFilter={stockFilter}
      techFilters={techFilters}
      techSpecOptions={techSpecOptions}
      activeFiltersCount={activeFiltersCount}
      onFamilyFilterChange={setFamilies}
      onTypeFilterChange={setTypes}
      onBrandFilterChange={setBrands}
      onStockFilterChange={setStockFilter}
      onTechFiltersChange={setTechFilters}
      onPageReset={() => setPage(1)}
      onClearAll={clearAllFilters}
    />
  );


  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} — VRCF Showroom</title>
        <meta name="description" content={subtitle} />
        <link rel="canonical" href={`https://showroom.vrcf.info/${mundo}`} />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2 sm:px-4">
          <Link to="/" className="shrink-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Início</span>
          </Link>
          <Link to="/" className="shrink-0"><img src={vrcfLogo} alt="VRCF" className="h-9 sm:h-11 w-auto" /></Link>
          <form onSubmit={submitGlobalSearch} className="relative flex-1 max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar em todo o catálogo..." value={globalQuery}
              onChange={e => setGlobalQuery(e.target.value)} className="pl-10 bg-muted/60 border-transparent h-9 text-sm rounded-xl" />
          </form>
          <div className="flex items-center gap-2 shrink-0">
            <DarkModeToggle />
            <UserMenuButton />
            <Button variant="outline" size="sm" className="relative gap-1.5 h-9" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Orçamento</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">{totalItems}</span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero compacto */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background to-muted/40 border-b border-border py-4 px-4">
        <div aria-hidden className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative max-w-2xl mx-auto text-center flex flex-col items-center gap-1.5">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${mundo === "seguranca" ? "bg-primary/10 border-primary/20 text-primary" : mundo === "economato" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-blue-500/10 border-blue-500/20 text-blue-500"}`}>
            <Icon className="h-3 w-3" /> {mundo === "seguranca" ? "Segurança & Redes" : mundo === "economato" ? "Economato" : "Informática & Tecnologia"}
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-xl">{subtitle}</p>
        </div>
      </section>

      {/* Banners deste mundo (ou transversais, mundo="todos") */}
      {banners.length > 0 && (
        <section className="px-3 py-3 max-w-[1600px] mx-auto w-full">
          <div className="relative overflow-hidden bg-black w-full aspect-[4/1]">
          {banners.map((b: any, i: number) => (
            <div key={b.id} className={`absolute inset-0 transition-opacity duration-500 ${i === bannerIdx ? "opacity-100" : "opacity-0"}`}>
              {b.link
                ? <Link to={b.link}><img src={b.image_url} alt={b.titulo || ""} className="w-full h-full object-cover" /></Link>
                : <img src={b.image_url} alt={b.titulo || ""} className="w-full h-full object-cover" />
              }
            </div>
          ))}
          {banners.length > 1 && (
            <>
              <button onClick={() => setBannerIdx(i => (i - 1 + banners.length) % banners.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setBannerIdx(i => (i + 1) % banners.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {banners.map((_: any, i: number) => (
                  <button key={i} onClick={() => setBannerIdx(i)}
                    className={`h-1 rounded-full transition-all ${i === bannerIdx ? "w-5 bg-white" : "w-1 bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
          </div>
        </section>
      )}

      {/* Categories strip */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Categorias</p>
            <div className="hidden sm:flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollRef.current?.scrollBy({ left: -280, behavior: "smooth" })}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollRef.current?.scrollBy({ left: 280, behavior: "smooth" })}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide scroll-smooth">
            <CategoryTile active={categoryFilter === "all"} onClick={() => setCategory("all")}
              icon={LayoutGrid} color="text-primary" bg="bg-primary/10" label="Todos" />
            {categories.map((cat: any) => {
              const meta = getCategoryMeta(cat.name);
              return (
                <CategoryTile key={cat.id} active={categoryFilter === cat.name} onClick={() => setCategory(cat.name)}
                  icon={meta.icon} color={meta.color} bg={meta.bg} label={cat.name} />
              );
            })}
          </div>
        </section>
      )}

      <BrandsStrip mundo={mundo} />

      {/* Main content */}
      <div className="container mx-auto px-4 pb-14 flex gap-6">

        {/* Sidebar filtros — desktop (só aparece após escolher uma categoria) */}
        {categoryFilter !== "all" && (
          <aside className="hidden lg:block w-64 shrink-0 pt-4">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold">Filtrar</h2>
                {activeFiltersCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px]">{activeFiltersCount}</Badge>
                )}
              </div>
              {renderFilterPanel()}
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 pt-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Pesquisar nesta secção..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/60 border-transparent rounded-xl" />
            </div>

            {/* Filtros mobile (só após escolher categoria) */}
            {categoryFilter !== "all" && (
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden gap-1.5 h-9 relative">
                    <SlidersHorizontal className="h-4 w-4" /> Filtros
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{activeFiltersCount}</span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] overflow-y-auto">
                  <SheetHeader className="pb-4">
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  {renderFilterPanel()}
                </SheetContent>
              </Sheet>
            )}

            <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Destaques</SelectItem>
                <SelectItem value="newest">Mais recentes</SelectItem>
                <SelectItem value="price-asc">Preço ↑</SelectItem>
                <SelectItem value="price-desc">Preço ↓</SelectItem>
                <SelectItem value="name-asc">Nome A-Z</SelectItem>
                <SelectItem value="name-desc">Nome Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros activos */}
          {(Object.keys(techFilters).length > 0 || categoryFilter !== "all" || familyFilter.length > 0 || typeFilter.length > 0 || brandFilter.length > 0 || stockFilter !== "all") && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {categoryFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                  {categoryFilter}
                  <button onClick={() => setCategory("all")} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {Object.entries(techFilters).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="gap-1 pr-1 text-xs">
                  {k.replace(/_/g, " ")}: {Array.isArray(v) ? v.join(", ") : v}
                  <button onClick={() => setTechFilters(p => { const n = { ...p }; delete n[k]; return n; })} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-destructive underline">Limpar tudo</button>
            </div>
          )}

          {/* Contador */}
          <p className="text-sm text-muted-foreground mb-4">
            {productsQuery.isLoading ? "A carregar..." : `${total} produto${total !== 1 ? "s" : ""} — Página ${page} de ${totalPages || 1}`}
          </p>
          {productsQuery.isError && (
            <p className="text-sm text-destructive mb-4">
              Erro ao filtrar produtos: {(productsQuery.error as any)?.message || String(productsQuery.error)}
            </p>
          )}

          {/* Grid */}
          {productsQuery.isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {products.map((product: any) => (
                  <ProductCard
                    key={product.id}
                    id={product.id} name={product.name} sku={product.sku} slug={product.slug}
                    description={product.short_description ?? product.description}
                    category={product.category} price={product.price}
                    imageUrl={product.image_url} images={[]}
                    familyName={product.family_id ? familyMap[product.family_id] || null : null}
                    brandName={product.brand || null}
                    featured={product.featured}
                    stockStatus={product.stock_status}
                    sobEncomenda={product.sob_encomenda}
                    weight={product.weight ?? null}
                    fornecedor={product.fornecedor ?? null}
                    envioEspecial={product.envio_especial ?? false}
                    teclado={(product.especificacoes as any)?.teclado ?? null}
                    minSaleQty={product.min_sale_qty ?? null}
                    onClick={() => navigate(`/produto/${product.slug ?? product.id}`)}
                  />
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Notas */}
              <div className="mt-8 space-y-1 text-center">
                {hasPrices && (
                  <p className="text-xs text-muted-foreground">
                    Preços em Euro (€) com IVA incluído à taxa legal em vigor. Podem ser actualizados sem aviso prévio.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Stock sujeito a disponibilidade. Prazo de entrega confirmado no orçamento final.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <Package className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-heading text-lg font-semibold">Nenhum produto encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">Tente ajustar a pesquisa ou os filtros.</p>
              {activeFiltersCount > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>Limpar filtros</Button>
              )}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="grid grid-cols-4 h-14">
          <Link to="/" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[9px] font-medium">Início</span>
          </Link>
          <button onClick={() => setFiltersOpen(true)} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground relative">
            <SlidersHorizontal className="h-5 w-5" />
            <span className="text-[9px] font-medium">Filtros</span>
            {activeFiltersCount > 0 && <span className="absolute top-1.5 right-5 bg-primary text-primary-foreground text-[8px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">{activeFiltersCount}</span>}
          </button>
          <Link to="/pesquisa" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
            <Search className="h-5 w-5" />
            <span className="text-[9px] font-medium">Pesquisa</span>
          </Link>
          <button onClick={() => setIsOpen(true)} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && <span className="absolute top-1.5 right-3 bg-primary text-primary-foreground text-[8px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">{totalItems}</span>}
            <span className="text-[9px] font-medium">Orçamento</span>
          </button>
        </div>
      </nav>
      <div className="h-14 sm:hidden" />

      <CartDrawer />
      <ContactFloatingBubble />
    </div>
  );
};


export default WorldCatalog;
