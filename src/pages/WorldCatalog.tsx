import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Package, ChevronLeft, ChevronRight, ShoppingCart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllProducts } from "@/lib/fetchAllRows";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilters } from "@/components/ProductFilters";
import { TechnicalFilters } from "@/components/TechnicalFilters";
import { BrandsStrip } from "@/components/BrandsStrip";
import { ContactFloatingBubble } from "@/components/ContactFloatingBubble";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import vrcfLogo from "@/assets/vrcf-logo.png";

type Mundo = "seguranca" | "escritorio";

interface Props {
  mundo: Mundo;
  title: string;
  subtitle: string;
  accentClass: string;
}

const PAGE_SIZE = 24;

const WorldCatalog = ({ mundo, title, subtitle, accentClass }: Props) => {
  const { totalItems, setIsOpen } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("categoria") ?? "all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState(searchParams.get("marca") ?? "all");
  const [sortBy, setSortBy] = useState("featured");
  const [techFilters, setTechFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", mundo],
    queryFn: () => fetchAllProducts(mundo),
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_families").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: productImages = [] } = useQuery({
    queryKey: ["product_images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_images").select("*").order("position");
      if (error) throw error;
      return data;
    },
  });

  const imagesByProduct = useMemo(() => {
    const acc: Record<string, typeof productImages> = {};
    productImages.forEach((img) => {
      if (!acc[img.product_id]) acc[img.product_id] = [];
      acc[img.product_id].push(img);
    });
    return acc;
  }, [productImages]);

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f.name]));
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    const result = products.filter((p) => {
      const terms = normalize(search).split(/\s+/).filter(Boolean);
      const txt = normalize(`${p.name} ${p.description ?? ""} ${p.short_description ?? ""}`);
      const matchesSearch = terms.length === 0 || terms.every((t) => txt.includes(t));
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      const matchesFamily = familyFilter === "all" || p.family_id === familyFilter;
      const matchesBrand = brandFilter === "all" || p.brand_id === brandFilter;
      const matchesTech = Object.entries(techFilters).every(([k, v]) => {
        if (!v) return true;
        const specs = (p.especificacoes ?? {}) as Record<string, unknown>;
        return String(specs[k] ?? "") === v;
      });
      return matchesSearch && matchesCategory && matchesFamily && matchesBrand && matchesTech;
    });

    return result.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      switch (sortBy) {
        case "price-asc": return (a.price ?? 0) - (b.price ?? 0);
        case "price-desc": return (b.price ?? 0) - (a.price ?? 0);
        case "name-asc": return a.name.localeCompare(b.name, "pt");
        case "name-desc": return b.name.localeCompare(a.name, "pt");
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: return 0;
      }
    });
  }, [products, search, categoryFilter, familyFilter, brandFilter, sortBy, techFilters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const visibleFamilies = families.filter((f) =>
    categoryFilter === "all" || f.category === categoryFilter
  );
  const visibleBrands = brands.filter((b) => products.some((p) => p.brand_id === b.id));

  const updateTechFilter = (key: string, value: string | null) => {
    setTechFilters((prev) => {
      const next = { ...prev };
      if (value == null) delete next[key];
      else next[key] = value;
      return next;
    });
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} — VRCF Showroom</title>
        <meta name="description" content={subtitle} />
        <link rel="canonical" href={`https://showroom.vrcf.info/${mundo}`} />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link to="/">
              <img src={vrcfLogo} alt="VRCF" className="h-10 sm:h-14 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="outline" size="sm" className="relative gap-1.5 h-9" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              Orçamento
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <section className={`relative overflow-hidden border-b border-border ${accentClass}`}>
        <div className="container mx-auto px-4 py-12 sm:py-16 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>
      </section>

      <BrandsStrip mundo={mundo} />

      <ProductFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        categoryFilter={categoryFilter}
        onCategoryChange={(v) => { setCategoryFilter(v); setFamilyFilter("all"); setCurrentPage(1); if (v === "all") { searchParams.delete("categoria"); } else { searchParams.set("categoria", v); } setSearchParams(searchParams); }}
        familyFilter={familyFilter}
        onFamilyChange={(v) => { setFamilyFilter(v); setCurrentPage(1); }}
        brandFilter={brandFilter}
        onBrandChange={(v) => { setBrandFilter(v); setCurrentPage(1); if (v === "all") { searchParams.delete("marca"); } else { searchParams.set("marca", v); } setSearchParams(searchParams); }}
        sortBy={sortBy}
        onSortChange={(v) => { setSortBy(v); setCurrentPage(1); }}
        categories={categories}
        visibleFamilies={visibleFamilies}
        visibleBrands={visibleBrands}
      />

      <section className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <TechnicalFilters
              products={filtered}
              activeFilters={techFilters}
              onFilterChange={updateTechFilter}
            />
          </aside>

          <div>
            {!isLoading && (
              <p className="mb-4 text-sm text-muted-foreground text-center">
                {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
                {totalPages > 1 && ` — Página ${currentPage} de ${totalPages}`}
              </p>
            )}

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paginated.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginated.map((product) => (
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
            ) : (
              <div className="text-center py-20">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
                <h3 className="mt-4 font-heading text-lg font-semibold">Nenhum produto encontrado</h3>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <CartDrawer />
      <ContactFloatingBubble />
    </div>
  );
};

export default WorldCatalog;
