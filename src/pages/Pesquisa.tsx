import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Package, ChevronLeft, ChevronRight, ShoppingCart, ArrowLeft, Search, Globe, Tag, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CartDrawer } from "@/components/CartDrawer";
import { UserMenuButton } from "@/components/UserMenuButton";
import { useCart } from "@/contexts/CartContext";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { SiteFooter } from "@/components/SiteFooter";

const PAGE_SIZE = 24;

const MUNDO_ROUTES: Record<string, string> = {
  seguranca: "/seguranca",
  escritorio: "/escritorio",
  economato: "/economato",
};

const Pesquisa = () => {
  const { totalItems, setIsOpen } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [mundoFilter, setMundoFilter] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
      if (searchInput) searchParams.set("q", searchInput); else searchParams.delete("q");
      setSearchParams(searchParams, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const productsQuery = useQuery({
    queryKey: ["global-search", search, mundoFilter, page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;

      if (search.trim()) {
        const { data, error } = await supabase.rpc("search_products", {
          p_query: search.trim(),
          p_mundo: mundoFilter !== "all" ? mundoFilter : null,
          p_limit: PAGE_SIZE,
          p_offset: from,
          p_order_by: "featured",
        });
        if (error) throw error;
        const rows = (data ?? []).map((r: any) => r.row_data);
        const count = data && data.length > 0 ? Number(data[0].total_count) : 0;
        return { rows, count };
      }

      let q = supabase.from("products").select("*", { count: "exact" }).eq("include_in_catalog", true);
      if (mundoFilter !== "all") q = q.eq("mundo", mundoFilter);
      q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
      const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    enabled: search.trim().length > 0,
  });

  const products = productsQuery.data?.rows ?? [];
  const total = productsQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Categorias com contagem precisa (agregação server-side)
  const categoriesQuery = useQuery({
    queryKey: ["search-categories", search, mundoFilter],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_search_category_counts", {
        p_query: search.trim(),
        p_mundo: mundoFilter,
      });
      if (error) throw error;
      return (data ?? []) as { category: string; count: number }[];
    },
    enabled: search.trim().length > 0 && mundoFilter !== "all",
    staleTime: 2 * 60 * 1000,
  });

  const categoryChips = useMemo(() => {
    return (categoriesQuery.data ?? [])
      .filter((r) => r.category)
      .map((r) => ({ name: r.category, count: Number(r.count) }));
  }, [categoriesQuery.data]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{search ? `Pesquisa: ${search}` : "Pesquisa"} — VRCF Showroom</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3">
          <Link to="/" className="shrink-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Início</span>
          </Link>
          <Link to="/" className="shrink-0">
            <img src={vrcfLogo} alt="VRCF" className="h-9 sm:h-12 w-auto" />
          </Link>
          <div className="relative flex-1 max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Pesquisar em todo o catálogo..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DarkModeToggle />
            <UserMenuButton />
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

        {/* Filtro por mundo */}
        <div className="border-t border-border/50 px-3 py-2 sm:px-4 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {[
              { value: "all", label: "Todos" },
              { value: "seguranca", label: "Segurança" },
              { value: "escritorio", label: "Escritório & IT" },
              { value: "economato", label: "Economato" },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => { setMundoFilter(m.value); setPage(1); }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  mundoFilter === m.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categorias do mundo selecionado */}
        {mundoFilter !== "all" && search.trim() && categoryChips.length > 0 && (
          <div className="border-t border-border/50 px-3 py-2 sm:px-4 flex items-start gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
            <div className="flex gap-1.5 flex-wrap">
              {categoryChips.map((c) => (
                <button
                  key={c.name}
                  onClick={() => navigate(`${MUNDO_ROUTES[mundoFilter]}?categoria=${encodeURIComponent(c.name)}&q=${encodeURIComponent(search.trim())}`)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                  title={`Ver categoria ${c.name}`}
                >
                  {c.name} <span className="text-muted-foreground/60">({c.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <section className="container mx-auto px-4 py-8">
        {!search.trim() ? (
          <div className="text-center py-20">
            <Search className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold">Pesquise em todo o catálogo VRCF</h3>
            <p className="mt-1 text-sm text-muted-foreground">Segurança, Redes, Escritório e IT — tudo num só lugar.</p>
          </div>
        ) : productsQuery.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : products.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground text-center">
              {total} resultado{total !== 1 ? "s" : ""} para "{search}" — Página {page} de {totalPages}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((product: any) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.short_description ?? product.description}
                  category={product.category}
                  price={product.price}
                  imageUrl={product.image_url}
                  images={[]}
                  familyName={null}
                  featured={product.featured}
                  stockStatus={product.stock_status}
                  minSaleQty={product.min_sale_qty ?? null}
                  onClick={() => navigate(`/produto/${product.slug ?? product.id}`)}
                />
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
          </>
        ) : (
          <div className="text-center py-16 space-y-4">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="font-heading text-lg font-semibold">Sem resultados para "{search}"</h3>
            <p className="text-sm text-muted-foreground">Tente outras palavras-chave ou referência SKU.</p>
            <div className="mt-6 inline-flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card max-w-sm mx-auto">
              <p className="text-sm font-medium">Não encontrou o que procura?</p>
              <p className="text-xs text-muted-foreground text-center">Podemos tratar de encontrar o produto por si. Fale connosco directamente.</p>
              <a
                href={`https://wa.me/351911564243?text=Ol%C3%A1%20VRCF%2C%20n%C3%A3o%20encontrei%20o%20produto%3A%20${encodeURIComponent(search)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Falar por WhatsApp
              </a>
            </div>
          </div>
        )}
      </section>

      <SiteFooter />

      <CartDrawer />
      <ContactFloatingBubble />
    </div>
  );
};

export default Pesquisa;
