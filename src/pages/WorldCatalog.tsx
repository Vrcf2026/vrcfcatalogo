import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Loader2, Package, ChevronLeft, ChevronRight, ShoppingCart, ArrowLeft, Search, LayoutGrid, ShieldCheck, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import BrandsStrip from "@/components/BrandsStrip";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import { getCategoryMeta } from "@/lib/categoryIcons";
import vrcfLogo from "@/assets/vrcf-logo.png";

type Mundo = "seguranca" | "escritorio";

interface Props {
  mundo: Mundo;
  title: string;
  subtitle: string;
}

const PAGE_SIZE = 24;

const WorldCatalog = ({ mundo, title, subtitle }: Props) => {
  const { totalItems, setIsOpen } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("categoria") ?? "all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState(searchParams.get("marca") ?? "all");
  const [sortBy, setSortBy] = useState("featured");
  const [page, setPage] = useState(1);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [categoryFilter, familyFilter, brandFilter, sortBy]);

  // categories for this mundo (visible only, ordered)
  const { data: categories = [] } = useQuery({
    queryKey: ["world-categories", mundo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("visivel", true)
        .in("mundo", [mundo, "todos"])
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_families").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const allowedCategoryNames = useMemo(() => categories.map((c: any) => c.name), [categories]);

  // server-side paginated products
  const productsQuery = useQuery({
    queryKey: ["world-products", mundo, search, categoryFilter, familyFilter, brandFilter, sortBy, page, allowedCategoryNames],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase.from("products").select("*", { count: "exact" });

      if (categoryFilter !== "all") {
        q = q.eq("category", categoryFilter);
      } else if (allowedCategoryNames.length > 0) {
        q = q.in("category", allowedCategoryNames);
      }
      if (familyFilter !== "all") q = q.eq("family_id", familyFilter);
      if (brandFilter !== "all") q = q.eq("brand_id", brandFilter);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`name.ilike.${term},sku.ilike.${term}`);
      }

      switch (sortBy) {
        case "name-asc": q = q.order("name", { ascending: true }); break;
        case "name-desc": q = q.order("name", { ascending: false }); break;
        case "newest": q = q.order("created_at", { ascending: false }); break;
        default:
          q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data, error, count } = await q.range(from, to);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: categories.length > 0 || allowedCategoryNames.length === 0,
  });

  const products = productsQuery.data?.rows ?? [];
  const total = productsQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // images only for visible products
  const visibleIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: productImages = [] } = useQuery({
    queryKey: ["world-product-images", visibleIds],
    queryFn: async () => {
      if (visibleIds.length === 0) return [];
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", visibleIds)
        .order("position");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: visibleIds.length > 0,
  });

  const imagesByProduct = useMemo(() => {
    const acc: Record<string, typeof productImages> = {};
    productImages.forEach((img) => {
      if (!acc[img.product_id]) acc[img.product_id] = [];
      acc[img.product_id].push(img);
    });
    return acc;
  }, [productImages]);

  const familyMap = Object.fromEntries(families.map((f: any) => [f.id, f.name]));
  const visibleFamilies = families.filter((f: any) => categoryFilter === "all" || f.category === categoryFilter);

  const hasPrices = products.some((p: any) => p.price != null);

  // category strip scroller
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = (delta: number) => scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });

  const setCategory = (name: string) => {
    setCategoryFilter(name);
    setFamilyFilter("all");
    if (name === "all") searchParams.delete("categoria"); else searchParams.set("categoria", name);
    setSearchParams(searchParams, { replace: true });
  };

  const Icon = mundo === "seguranca" ? ShieldCheck : Monitor;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} — VRCF Showroom</title>
        <meta name="description" content={subtitle} />
        <link rel="canonical" href={`https://showroom.vrcf.info/${mundo}`} />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3">
          <Link to="/" className="shrink-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Voltar</span>
          </Link>
          <Link to="/" className="shrink-0">
            <img src={vrcfLogo} alt="VRCF" className="h-9 sm:h-12 w-auto" />
          </Link>
          <div className="relative flex-1 max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou referência..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DarkModeToggle />
            <Button variant="outline" size="sm" className="relative gap-1.5 h-9" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Orçamento</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero title */}
      <section className={`relative overflow-hidden border-b border-border ${mundo === "seguranca" ? "" : ""}`}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.09] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 35%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className={`absolute -top-24 left-1/2 -translate-x-1/2 h-[320px] w-[700px] rounded-full blur-3xl pointer-events-none ${
            mundo === "seguranca" ? "bg-primary/20" : "bg-blue-500/20"
          }`}
        />
        <div className="relative container mx-auto px-4 py-10 sm:py-14 text-center">
          <Badge className={`gap-1.5 px-3 py-1 ${mundo === "seguranca" ? "bg-primary text-primary-foreground" : "bg-blue-500 text-white"}`}>
            <Icon className="h-3.5 w-3.5" /> {mundo === "seguranca" ? "Segurança & Redes" : "Escritório & IT"}
          </Badge>
          <h1 className="mt-4 font-heading text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>
      </section>

      {/* Categories strip */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Explorar por categoria</h2>
            <div className="hidden sm:flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scrollBy(-300)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scrollBy(300)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth snap-x">
              <CategoryTile
                active={categoryFilter === "all"}
                onClick={() => setCategory("all")}
                icon={LayoutGrid}
                color="text-primary"
                bg="bg-primary/10"
                label="Todos"
              />
              {categories.map((cat: any) => {
                const meta = getCategoryMeta(cat.name);
                return (
                  <CategoryTile
                    key={cat.id}
                    active={categoryFilter === cat.name}
                    onClick={() => setCategory(cat.name)}
                    icon={meta.icon}
                    color={meta.color}
                    bg={meta.bg}
                    label={cat.name}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      <BrandsStrip mundo={mundo} />

      {/* Filters row */}
      <section className="container mx-auto px-4 pb-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {visibleFamilies.length > 0 && (
              <Select value={familyFilter} onValueChange={setFamilyFilter}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Famílias" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Famílias</SelectItem>
                  {visibleFamilies.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={brandFilter} onValueChange={(v) => {
              setBrandFilter(v);
              if (v === "all") searchParams.delete("marca"); else searchParams.set("marca", v);
              setSearchParams(searchParams, { replace: true });
            }}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Marcas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Marcas</SelectItem>
                {brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Destaques</SelectItem>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
              <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-4 pb-12">
        {productsQuery.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : products.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground text-center">
              {total} produto{total !== 1 ? "s" : ""} — Página {page} de {totalPages}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((product: any) => (
                <Link key={product.id} to={`/produto/${product.slug ?? product.id}`} className="contents">
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    description={product.short_description ?? product.description}
                    category={product.category}
                    price={product.price}
                    imageUrl={product.image_url}
                    images={imagesByProduct[product.id] || []}
                    familyName={product.family_id ? familyMap[product.family_id] || null : null}
                    featured={product.featured}
                  />
                </Link>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {hasPrices && (
              <p className="mt-8 text-center text-xs text-muted-foreground">
                Preços indicativos em Euro (€). IVA incluído à taxa legal em vigor.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold">Nenhum produto encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">Tente ajustar a pesquisa ou os filtros.</p>
          </div>
        )}
      </section>

      <CartDrawer />
      <ContactFloatingBubble />
    </div>
  );
};

function CategoryTile({
  active, onClick, icon: Icon, color, bg, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group snap-start shrink-0 w-[100px] sm:w-[120px] h-[100px] sm:h-[120px] rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 p-2 ${
        active
          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
          : "border-border hover:border-primary/40 bg-card"
      }`}
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <span className="text-[11px] sm:text-xs font-medium text-foreground text-center leading-tight line-clamp-2 px-1">
        {label}
      </span>
    </button>
  );
}

export default WorldCatalog;
