import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Package, ShieldCheck, ChevronLeft, ChevronRight, ShoppingCart, ArrowLeft, Search, Globe, Tag, MessageCircle, Wand2 } from "lucide-react";
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
import { PRODUCT_PUBLIC_COLUMNS } from "@/lib/productColumns";

const PAGE_SIZE = 24;

const MUNDO_ROUTES: Record<string, string> = {
  seguranca: "/seguranca",
  escritorio: "/escritorio",
  economato: "/economato",
};

type AiFilters = {
  terms: string;
  mundo: string | null;
  category: string | null;
  brand: string | null;
  min_price: number | null;
  max_price: number | null;
  summary: string;
};

/** Frase em linguagem natural (vale a pena chamar a IA) vs. pesquisa direta. */
function isNaturalQuery(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (s.length < 3) return false;
  const words = s.split(/\s+/);
  // \b não funciona com acentos em JS, por isso compara palavra a palavra
  const has = (...w: string[]) => words.some((x) => w.includes(x));
  if (/€|\d\s*eur/.test(s) || has("euro", "euros", "até", "ate", "barato", "barata", "baratos", "baratas", "económico", "económica")) return true;
  if (/menos de|mais de/.test(s)) return true;
  if (words.length >= 3 && has("para", "preciso", "quero", "procuro", "algo", "bom", "boa", "melhor", "que", "sem")) return true;
  return words.length >= 5;
}

type SearchArgs = {
  terms: string;
  mundo: string | null;
  category: string | null;
  brand: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  page: number;
  allowFallback: boolean;
};

// Se a migração com os novos parâmetros ainda não estiver aplicada, usa a assinatura antiga
let legacySearch = false;

async function searchOnce(a: SearchArgs, opts: { category: string | null; brand: string | null; matchAny: boolean }) {
  const from = (a.page - 1) * PAGE_SIZE;
  const hasPrice = a.minPrice != null || a.maxPrice != null;
  const base = {
    p_query: a.terms,
    p_mundo: a.mundo,
    p_category: opts.category,
    p_brand: opts.brand,
    p_order_by: "featured",
  };

  if (!legacySearch) {
    const { data, error } = await (supabase.rpc as any)("search_products", {
      ...base,
      p_limit: PAGE_SIZE,
      p_offset: from,
      p_min_price: a.minPrice,
      p_max_price: a.maxPrice,
      p_match_any: opts.matchAny,
    });
    if (!error) {
      const rows = (data ?? []).map((r: any) => r.row_data);
      const count = data && data.length > 0 ? Number(data[0].total_count) : 0;
      return { rows, count };
    }
    if (error.code !== "PGRST202") throw error;
    legacySearch = true;
  }

  // Assinatura antiga: sem preço nem "qualquer termo" no SQL
  const { data, error } = await supabase.rpc("search_products", {
    ...base,
    p_limit: hasPrice ? 300 : PAGE_SIZE,
    p_offset: hasPrice ? 0 : from,
  } as any);
  if (error) throw error;
  let rows = (data ?? []).map((r: any) => r.row_data);
  if (hasPrice) {
    rows = rows.filter((p: any) => p.price != null && (a.minPrice == null || p.price >= a.minPrice) && (a.maxPrice == null || p.price <= a.maxPrice));
    return { rows: rows.slice(from, from + PAGE_SIZE), count: rows.length };
  }
  return { rows, count: data && data.length > 0 ? Number(data[0].total_count) : 0 };
}

/** Pesquisa com plano B: filtros da IA → sem categoria/marca → qualquer termo. */
async function runSearch(a: SearchArgs) {
  const attempts: { category: string | null; brand: string | null; matchAny: boolean }[] = [
    { category: a.category, brand: a.brand, matchAny: false },
  ];
  if (a.allowFallback) {
    if (a.category || a.brand) attempts.push({ category: null, brand: a.brand, matchAny: false });
    if (a.brand) attempts.push({ category: null, brand: null, matchAny: false });
    if (a.terms.split(/\s+/).length > 1) attempts.push({ category: null, brand: null, matchAny: true });
  }
  let last = { rows: [] as any[], count: 0 };
  for (let i = 0; i < attempts.length; i++) {
    last = await searchOnce(a, attempts[i]);
    if (last.count > 0) return { ...last, relaxed: i > 0 };
  }
  return { ...last, relaxed: false };
}

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

  // Pesquisa inteligente (IA) — só para frases em linguagem natural.
  // Pesquisas exatas ("câmara dahua 4mp", referências) vão direto à BD: mais rápido e sem custo.
  const [exactMode, setExactMode] = useState(false);
  useEffect(() => { setExactMode(false); }, [search]);
  const isNatural = useMemo(() => isNaturalQuery(search), [search]);

  const aiQuery = useQuery({
    queryKey: ["smart-search", search.trim().toLowerCase()],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("smart-search", { body: { query: search.trim() } });
      if (error || data?.error) return null;
      return data as AiFilters;
    },
    enabled: isNatural && !exactMode,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const ai = isNatural && !exactMode ? aiQuery.data ?? null : null;
  const aiPending = isNatural && !exactMode && aiQuery.isLoading;
  const effTerms = ai?.terms?.trim() || search.trim();
  const effMundo = mundoFilter !== "all" ? mundoFilter : ai?.mundo ?? null;
  const aiCategory = mundoFilter === "all" || mundoFilter === ai?.mundo ? ai?.category ?? null : null;
  const aiBrand = ai?.brand ?? null;
  const minP = ai?.min_price ?? null;
  const maxP = ai?.max_price ?? null;

  const productsQuery = useQuery({
    queryKey: ["global-search", effTerms, effMundo, aiCategory, aiBrand, minP, maxP, page],
    queryFn: () => runSearch({
      terms: effTerms,
      mundo: effMundo,
      category: aiCategory,
      brand: aiBrand,
      minPrice: minP,
      maxPrice: maxP,
      page,
      // Só a pesquisa interpretada pela IA tem plano B; a exata mostra o que encontra
      allowFallback: !!ai,
    }),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    enabled: search.trim().length > 0 && !aiPending,
  });

  // Registar a pesquisa (uma vez por pesquisa) para a gestão ver o que não se encontra
  const loggedRef = useRef<string>("");
  useEffect(() => {
    const d = productsQuery.data;
    if (!d || productsQuery.isPlaceholderData || page !== 1 || !search.trim()) return;
    const key = `${search.trim().toLowerCase()}|${effMundo ?? ""}|${!!ai}`;
    if (loggedRef.current === key) return;
    loggedRef.current = key;
    (supabase.rpc as any)("log_search", {
      p_query: search.trim(),
      p_terms: ai ? effTerms : null,
      p_mundo: effMundo,
      p_results: d.relaxed ? 0 : d.count,
      p_ai: !!ai,
    }).then(() => {}, () => {});
  }, [productsQuery.data, productsQuery.isPlaceholderData]);

  const products = productsQuery.data?.rows ?? [];
  const total = productsQuery.data?.count ?? 0;
  const relaxed = productsQuery.data?.relaxed ?? false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Categorias com contagem precisa (agregação server-side), coerentes com os termos usados
  const chipTerms = ai ? effTerms : search.trim();
  const categoriesQuery = useQuery({
    queryKey: ["search-categories", chipTerms, effMundo],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_search_category_counts", {
        p_query: chipTerms,
        p_mundo: effMundo,
      });
      if (error) throw error;
      return (data ?? []) as { category: string; count: number }[];
    },
    enabled: chipTerms.length > 0 && !!effMundo,
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
            <img src={vrcfLogo} alt="VRCF Informática e Segurança" className="h-9 sm:h-12 w-auto" />
          </Link>
          <div className="relative flex-1 max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Ex: portátil para a escola até 500€"
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
        {effMundo && MUNDO_ROUTES[effMundo] && search.trim() && categoryChips.length > 0 && (
          <div className="border-t border-border/50 px-3 py-2 sm:px-4 flex items-start gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
            <div className="flex gap-1.5 flex-wrap">
              {categoryChips.map((c) => (
                <button
                  key={c.name}
                  onClick={() => navigate(`${MUNDO_ROUTES[effMundo]}?categoria=${encodeURIComponent(c.name)}&q=${encodeURIComponent(chipTerms)}`)}
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
        <h1 className="sr-only">
          {search.trim() ? `Resultados de pesquisa para "${search.trim()}"` : "Pesquisa de produtos no catálogo VRCF"}
        </h1>

        {!search.trim() ? (
          <div className="text-center py-20">
            <Search className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold">Pesquise em todo o catálogo VRCF</h3>
            <p className="mt-1 text-sm text-muted-foreground">Segurança, Redes, Escritório e IT — tudo num só lugar.</p>
          </div>
        ) : aiPending || productsQuery.isLoading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {aiPending && <p className="text-sm text-muted-foreground">A interpretar a sua pesquisa…</p>}
          </div>
        ) : products.length > 0 ? (
          <>
            {ai && (
              <div className="mb-4 mx-auto max-w-2xl flex flex-wrap items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
                <Wand2 className="h-4 w-4 text-primary shrink-0" />
                <span>{relaxed ? "Não encontrámos tudo o que pediu — mostramos os produtos mais próximos." : ai.summary}</span>
                <button onClick={() => setExactMode(true)} className="text-xs text-muted-foreground underline hover:text-foreground">
                  Pesquisar texto exato
                </button>
              </div>
            )}
            <p className="mb-4 text-sm text-muted-foreground text-center">
              {total} resultado{total !== 1 ? "s" : ""} para "{ai ? effTerms : search}" — Página {page} de {totalPages}
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

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="grid grid-cols-4 h-14">
          <Link to="/" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[9px] font-medium">Início</span>
          </Link>
          <Link to="/seguranca" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[9px] font-medium">Segurança</span>
          </Link>
          <Link to="/economato" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
            <Package className="h-5 w-5" />
            <span className="text-[9px] font-medium">Economato</span>
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

export default Pesquisa;
