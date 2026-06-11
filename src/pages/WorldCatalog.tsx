import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Loader2, Package, ChevronLeft, ChevronRight, ShoppingCart, ArrowLeft,
  Search, LayoutGrid, ShieldCheck, Monitor, SlidersHorizontal, X,
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
import { useCart } from "@/contexts/CartContext";
import { getCategoryMeta } from "@/lib/categoryIcons.tsx";
import vrcfLogo from "@/assets/vrcf-logo.png";

type Mundo = "seguranca" | "escritorio";
interface Props { mundo: Mundo; title: string; subtitle: string; }
const PAGE_SIZE = 24;

const WorldCatalog = ({ mundo, title, subtitle }: Props) => {
  const navigate = useNavigate();
  const { totalItems, setIsOpen } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("categoria") ?? "all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState(searchParams.get("marca") ?? "all");
  const [sortBy, setSortBy] = useState("featured");
  const [techFilters, setTechFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    queryKey: ["families"],
    queryFn: async () => {
      const { data } = await supabase.from("product_families").select("*").order("name");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Brands
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("*").order("name");
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Products query
  const productsQuery = useQuery({
    queryKey: ["products", mundo, search, categoryFilter, familyFilter, brandFilter, sortBy, page, techFilters],
    queryFn: async () => {
      let q = supabase.from("products").select("*", { count: "exact" })
        .eq("mundo", mundo)
        .eq("include_in_catalog", true);

      if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,short_description.ilike.%${search}%`);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (familyFilter !== "all") q = q.eq("family_id", familyFilter);
      if (brandFilter !== "all") q = q.or(`brand_id.eq.${brandFilter},brand.eq.${brands.find((b: any) => b.id === brandFilter)?.name ?? ""}`);

      if (sortBy === "featured") q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
      else if (sortBy === "price-asc") q = q.order("price", { ascending: true, nullsFirst: false });
      else if (sortBy === "price-desc") q = q.order("price", { ascending: false, nullsFirst: false });
      else if (sortBy === "name-asc") q = q.order("name", { ascending: true });
      else if (sortBy === "name-desc") q = q.order("name", { ascending: false });
      else if (sortBy === "newest") q = q.order("created_at", { ascending: false });

      const from = (page - 1) * PAGE_SIZE;
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

  // Filtros técnicos — gerados a partir dos produtos da página actual
  const techSpecOptions = useMemo(() => {
    const map: Record<string, Map<string, number>> = {};
    products.forEach((p: any) => {
      const specs = (typeof p.especificacoes === "string"
        ? JSON.parse(p.especificacoes || "{}")
        : p.especificacoes ?? {}) as Record<string, unknown>;
      Object.entries(specs).forEach(([k, v]) => {
        if (!v || typeof v !== "string" || v.length > 50) return;
        // Ignorar campos muito específicos
        if (["portas", "compatibilidade", "firmware_ota", "teclado_nota"].includes(k)) return;
        if (!map[k]) map[k] = new Map();
        map[k].set(v, (map[k].get(v) ?? 0) + 1);
      });
    });
    return Object.entries(map)
      .map(([key, vals]) => ({
        key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        values: [...vals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v, c]) => ({ value: v, count: c })),
      }))
      .filter(g => g.values.length > 1)
      .sort((a, b) => b.values.length - a.values.length)
      .slice(0, 10);
  }, [products]);

  // Filtrar produtos por specs técnicas (client-side)
  const filteredProducts = useMemo(() => {
    if (Object.keys(techFilters).length === 0) return products;
    return products.filter((p: any) => {
      const specs = (typeof p.especificacoes === "string"
        ? JSON.parse(p.especificacoes || "{}")
        : p.especificacoes ?? {}) as Record<string, string>;
      return Object.entries(techFilters).every(([k, v]) => specs[k] === v);
    });
  }, [products, techFilters]);

  const familyMap = Object.fromEntries(families.map((f: any) => [f.id, f.name]));
  const visibleFamilies = families.filter((f: any) => categoryFilter === "all" || f.category === categoryFilter);
  const hasPrices = products.some((p: any) => p.price != null);
  const activeFiltersCount = [
    categoryFilter !== "all", familyFilter !== "all", brandFilter !== "all",
    Object.keys(techFilters).length > 0,
  ].filter(Boolean).length;

  const setCategory = (name: string) => {
    setCategoryFilter(name); setFamilyFilter("all"); setPage(1);
    if (name === "all") searchParams.delete("categoria"); else searchParams.set("categoria", name);
    setSearchParams(searchParams, { replace: true });
  };

  const clearAllFilters = () => {
    setCategoryFilter("all"); setFamilyFilter("all"); setBrandFilter("all");
    setTechFilters({}); setSearch(""); setSearchInput(""); setPage(1);
    searchParams.delete("categoria"); searchParams.delete("marca");
    setSearchParams(searchParams, { replace: true });
  };

  const Icon = mundo === "seguranca" ? ShieldCheck : Monitor;

  // Painel de filtros (partilhado entre sidebar e sheet mobile)
  const FilterPanel = () => (
    <div className="space-y-5">
      {/* Filtros base */}
      {visibleFamilies.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Família</p>
          <Select value={familyFilter} onValueChange={v => { setFamilyFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as famílias</SelectItem>
              {visibleFamilies.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Marca</p>
        <Select value={brandFilter} onValueChange={v => {
          setBrandFilter(v); setPage(1);
          if (v === "all") searchParams.delete("marca"); else searchParams.set("marca", v);
          setSearchParams(searchParams, { replace: true });
        }}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as marcas</SelectItem>
            {brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Filtros técnicos */}
      {techSpecOptions.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especificações</p>
          {techSpecOptions.map(group => (
            <div key={group.key} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground capitalize">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.values.map(({ value, count }) => {
                  const active = techFilters[group.key] === value;
                  return (
                    <button key={value} onClick={() => {
                      setTechFilters(prev => {
                        if (active) { const n = { ...prev }; delete n[group.key]; return n; }
                        return { ...prev, [group.key]: value };
                      });
                      setPage(1);
                    }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/50 text-foreground"
                      }`}>
                      {value} <span className="opacity-50 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={clearAllFilters}>
          <X className="h-3.5 w-3.5" /> Limpar todos os filtros
        </Button>
      )}
    </div>
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

      {/* Hero */}
      <section className={`relative overflow-hidden border-b border-border py-8 sm:py-10`}>
        <div aria-hidden className={`absolute -top-20 left-1/2 -translate-x-1/2 h-[280px] w-[600px] rounded-full blur-3xl pointer-events-none ${mundo === "seguranca" ? "bg-primary/15" : "bg-blue-500/15"}`} />
        <div className="relative container mx-auto px-4 text-center">
          <Badge className={`gap-1.5 px-3 py-1 mb-3 ${mundo === "seguranca" ? "bg-primary text-primary-foreground" : "bg-blue-500 text-white"}`}>
            <Icon className="h-3.5 w-3.5" /> {mundo === "seguranca" ? "Segurança & Redes" : "Escritório & IT"}
          </Badge>
          <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
        </div>
      </section>

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

        {/* Sidebar filtros — desktop */}
        <aside className="hidden lg:block w-64 shrink-0 pt-4">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">Filtrar</h2>
              {activeFiltersCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-[10px]">{activeFiltersCount}</Badge>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        <div className="flex-1 min-w-0 pt-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Pesquisar nesta secção..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/60 border-transparent rounded-xl" />
            </div>

            {/* Filtros mobile */}
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
                <FilterPanel />
              </SheetContent>
            </Sheet>

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
          {(Object.keys(techFilters).length > 0 || categoryFilter !== "all" || familyFilter !== "all" || brandFilter !== "all") && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {categoryFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                  {categoryFilter}
                  <button onClick={() => setCategory("all")} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {Object.entries(techFilters).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="gap-1 pr-1 text-xs">
                  {k.replace(/_/g, " ")}: {v}
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

          {/* Grid */}
          {productsQuery.isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product: any) => (
                  <Link key={product.id} to={`/produto/${product.slug ?? product.id}`} className="contents">
                    <ProductCard
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
                    />
                  </Link>
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
                    Preços indicativos em Euro (€) com IVA incluído à taxa legal em vigor. Podem ser actualizados sem aviso prévio.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Stock referente ao armazém online. Entrega em 48h a 72h úteis após confirmação de pagamento.
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

function CategoryTile({ active, onClick, icon: Icon, color, bg, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; color: string; bg: string; label: string;
}) {
  return (
    <button onClick={onClick}
      className={`shrink-0 w-[80px] sm:w-[90px] h-[80px] sm:h-[90px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 p-2 ${active
        ? "border-primary ring-2 ring-primary/30 bg-primary/5"
        : "border-border hover:border-primary/40 bg-card"
      }`}>
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-4.5 w-4.5 ${color}`} />
      </div>
      <span className="text-[10px] sm:text-[11px] font-semibold text-foreground text-center leading-tight line-clamp-2">{label}</span>
    </button>
  );
}

export default WorldCatalog;
