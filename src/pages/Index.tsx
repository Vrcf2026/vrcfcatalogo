import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Monitor, Search, ShoppingCart,
  ArrowRight, ChevronLeft, ChevronRight, Star, Package, Send, Zap,
  Wifi, Camera, Lock, Cpu, Printer, Tablet, ShoppingBag,
  TrendingUp, History,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { UserMenuButton } from "@/components/UserMenuButton";
import { useCart } from "@/contexts/CartContext";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryMeta } from "@/lib/categoryIcons.tsx";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { SiteFooter } from "@/components/SiteFooter";
import { QueryError } from "@/components/QueryError";

// ── HOOKS ────────────────────────────────────────────────────────────────────

const useFeaturedProducts = (mundo?: string) =>
  useQuery({
    queryKey: ["hp-featured", mundo],
    queryFn: async () => {
      let q = supabase.from("products").select("*")
        .eq("include_in_catalog", true)
        .eq("show_on_homepage", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (mundo) q = (q as any).eq("mundo", mundo);
      const { data, error } = await q;
      if (error) throw error;
      if (data && data.length > 0) return data;
      let q2 = supabase.from("products").select("*")
        .eq("include_in_catalog", true)
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (mundo) q2 = (q2 as any).eq("mundo", mundo);
      const { data: fb, error: e2 } = await q2;
      if (e2) throw e2;
      return fb ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

const useCategories = (mundo: string) =>
  useQuery({
    queryKey: ["hp-categories", mundo],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*")
        .in("mundo", [mundo, "todos"]).eq("visivel", true)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

const useWorldCount = (mundo: string) =>
  useQuery({
    queryKey: ["hp-count", mundo],
    queryFn: async () => {
      const { count, error } = await supabase.from("products").select("*", { count: "exact", head: true })
        .eq("mundo", mundo).eq("include_in_catalog", true);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

const useBrands = () =>
  useQuery({
    queryKey: ["hp-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name,logo_url")
        .eq("show_on_homepage", true).order("name").limit(16);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

const useBanners = () =>
  useQuery({
    queryKey: ["hp-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*")
        .eq("ativo", true).in("mundo", ["todos", "homepage"]).order("ordem");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

// ── COMPONENT ─────────────────────────────────────────────────────────────────

// Hook: Mais Vistos (via analytics de cliques)
const useMaisVistos = () =>
  useQuery({
    queryKey: ["hp-mais-vistos"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_top_products_with_context", {
        p_event_type: "click",
        p_since: null,
        p_limit: 8,
      });
      if (!data || data.length === 0) {
        // fallback: produtos em destaque
        const { data: fb } = await supabase.from("products").select(
          "id,name,slug,price,image_url,stock_status,category,brand,mundo,min_sale_qty,short_description,sku"
        ).eq("include_in_catalog", true).eq("featured", true).limit(8);
        return fb ?? [];
      }
      return data.map((r: any) => ({ ...r, id: r.product_id }));
    },
    staleTime: 5 * 60 * 1000,
  });

// Hook: Vistos Recentemente (localStorage — sem login)
const useRecentlyViewed = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("vrcf_recently_viewed");
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  return items;
};

// Util: adicionar produto ao "vistos recentemente" (chamar na página de produto)
export function addToRecentlyViewed(product: {
  id: string; name: string; slug?: string; price?: number;
  image_url?: string; stock_status?: string; category?: string;
  brand?: string; mundo?: string; min_sale_qty?: number; sku?: string;
}) {
  try {
    const raw = localStorage.getItem("vrcf_recently_viewed");
    const existing: any[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((p: any) => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, 8);
    localStorage.setItem("vrcf_recently_viewed", JSON.stringify(updated));
  } catch { /* ignore */ }
}

const Index = () => {
  const { totalItems, setIsOpen } = useCart();
  const [query, setQuery] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);
  const [activeMundo, setActiveMundo] = useState<"seguranca" | "escritorio" | "economato">("seguranca");
  const navigate = useNavigate();
  const timerRef = useRef<any>(null);

  const banners = useBanners();
  const brands = useBrands();
  const segCount = useWorldCount("seguranca");
  const escCount = useWorldCount("escritorio");
  const segCats = useCategories("seguranca");
  const escCats = useCategories("escritorio");
  const ecoCount = useWorldCount("economato");
  const ecoCats = useCategories("economato");
  const featured = useFeaturedProducts();
  const maisVistos = useMaisVistos();
  const recentlyViewed = useRecentlyViewed();

  useEffect(() => {
    if (!banners.data || banners.data.length <= 1) return;
    const len = banners.data.length;
    timerRef.current = setInterval(() => setBannerIdx(i => (i + 1) % len), 5000);
    return () => clearInterval(timerRef.current);
  }, [banners.data]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/pesquisa?q=${encodeURIComponent(query.trim())}`);
  };

  const cats = activeMundo === "seguranca" ? segCats.data ?? [] : activeMundo === "escritorio" ? escCats.data ?? [] : ecoCats.data ?? [];
  const worldPath = activeMundo === "seguranca" ? "/seguranca" : activeMundo === "escritorio" ? "/escritorio" : "/economato";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>VRCF Showroom — Segurança, Redes, Informática & Economato | Montijo</title>
        <meta name="description" content="Catálogo B2B VRCF: câmaras IP, alarmes, redes, informática recondicionada e material de escritório. +27.000 produtos. Peça orçamento online — Montijo." />
        <link rel="canonical" href="https://catalogo.vrcf.pt/" />
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="VRCF Showroom" />
        <meta property="og:title"       content="VRCF Showroom — Segurança, Redes, Informática & Economato | Montijo" />
        <meta property="og:description" content="Catálogo B2B VRCF: câmaras IP, alarmes, redes, informática recondicionada e material de escritório. +27.000 produtos. Peça orçamento online." />
        <meta property="og:url"         content="https://catalogo.vrcf.pt/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          "name": "VRCF — Informática & Segurança",
          "description": "Catálogo B2B de segurança, informática e economato. Peça orçamento online.",
          "url": "https://catalogo.vrcf.pt/",
          "telephone": "+351911564243",
          "email": "geral@vrcf.pt",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Rua Luís Calado Nunes 15 Loja B",
            "addressLocality": "Montijo",
            "postalCode": "2870-350",
            "addressCountry": "PT"
          },
          "openingHours": "Mo-Fr 09:00-18:00",
          "priceRange": "€€",
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Catálogo VRCF",
            "numberOfItems": 27000
          }
        })}</script>
      </Helmet>

      <WelcomeBanner />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2 max-w-[1600px] mx-auto">
          <Link to="/" className="shrink-0">
            <img src={vrcfLogo} alt="VRCF" className="h-8 sm:h-10 w-auto" />
          </Link>
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Pesquisar produto, marca ou SKU…"
              className="pl-9 h-9 text-sm bg-muted/60 border-transparent focus:bg-card focus:border-border rounded-xl"
            />
          </form>
          <DarkModeToggle />
          <UserMenuButton />
          <button onClick={() => setIsOpen(true)} className="relative p-2 rounded-xl hover:bg-muted transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── HERO COMPACTO ── */}
      <HeroRotativo />


      {/* ── WORLD SELECTOR ── */}
      <section className="px-3 pt-4 pb-2 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <WorldBtn
            active={activeMundo === "seguranca"}
            onClick={() => setActiveMundo("seguranca")}
            to="/seguranca"
            icon={ShieldCheck}
            label="Segurança & Redes"
            count={segCount.data}
            color="orange"
          />
          <WorldBtn
            active={activeMundo === "escritorio"}
            onClick={() => setActiveMundo("escritorio")}
            to="/escritorio"
            icon={Monitor}
            label="Informática & Tecnologia"
            count={escCount.data}
            color="blue"
          />
          <WorldBtn
            active={activeMundo === "economato"}
            onClick={() => setActiveMundo("economato")}
            to="/economato"
            icon={ShoppingBag}
            label="Economato"
            count={ecoCount.data}
            color="green"
          />
        </div>
      </section>

      {/* ── CATEGORIES STRIP ── */}
      {cats.length > 0 && (
        <section className="px-3 pb-3 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${activeMundo === "seguranca" ? "bg-primary" : activeMundo === "escritorio" ? "bg-blue-500" : "bg-green-600"}`} />
              Categorias · {activeMundo === "seguranca" ? "Segurança & Redes" : activeMundo === "escritorio" ? "Informática & Tecnologia" : "Economato"}
            </p>
            <Link to={worldPath} className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {cats.map((c: any) => {
              const meta = getCategoryMeta(c.name);
              const Icon = meta.icon;
              return (
                <Link key={c.id} to={`${worldPath}?categoria=${encodeURIComponent(c.name)}`}
                  className="shrink-0 flex flex-col items-center gap-1.5 p-3 w-[88px] h-[88px] rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <span className="text-[9px] font-semibold text-foreground text-center leading-tight line-clamp-2">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── BANNERS ── */}
      {banners.data && banners.data.length > 0 && (
        <section className="px-3 py-3 max-w-[1600px] mx-auto w-full">
          <div className="relative overflow-hidden bg-black w-full rounded-xl" style={{ aspectRatio: "16/5", maxHeight: "320px" }}>
          {banners.data.map((b: any, i: number) => (
            <div key={b.id} className={`absolute inset-0 transition-opacity duration-500 ${i === bannerIdx ? "opacity-100" : "opacity-0"}`}>
              {b.link
                ? <Link to={b.link}><img src={b.image_url} alt={b.titulo || ""} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} decoding="async" className="w-full h-full object-cover" /></Link>
                : <img src={b.image_url} alt={b.titulo || ""} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} decoding="async" className="w-full h-full object-cover" />
              }
            </div>
          ))}
          {banners.data.length > 1 && (
            <>
              <button onClick={() => setBannerIdx(i => (i - 1 + banners.data.length) % banners.data.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setBannerIdx(i => (i + 1) % banners.data.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {banners.data.map((_: any, i: number) => (
                  <button key={i} onClick={() => setBannerIdx(i)}
                    className={`h-1 rounded-full transition-all ${i === bannerIdx ? "w-5 bg-white" : "w-1 bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      <section className="px-3 pb-5 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Star className="h-4 w-4 text-primary fill-primary" /> Em destaque
          </h2>
          <Link to={worldPath} className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5">
            Ver mais <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {featured.isError ? (
          <QueryError message="Não foi possível carregar os produtos em destaque." onRetry={() => featured.refetch()} />
        ) : featured.data && featured.data.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featured.data.slice(0, 6).map((p: any) => (
              <ProductCard
                key={p.id}
                id={p.id} name={p.name} sku={p.sku} slug={p.slug}
                description={p.short_description ?? p.description}
                category={p.category} price={p.price}
                imageUrl={p.image_url} images={[]}
                familyName={null} brandName={p.brand || null}
                featured={p.featured} stockStatus={p.stock_status}
                minSaleQty={p.min_sale_qty ?? null}
                onClick={() => navigate(`/produto/${p.slug ?? p.id}`)}
              />
            ))}
          </div>
        ) : null}
      </section>


      {/* ── BRANDS ── */}
      {brands.data && brands.data.length > 0 && (
        <section className="border-t border-border/40 bg-background py-4 px-4">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-wrap justify-center gap-3">
              {brands.data.map((b: any) => (
                <Link
                  key={b.id}
                  to={`/pesquisa?marca=${encodeURIComponent(b.name)}`}
                  title={b.name}
                  className="flex items-center justify-center h-12 w-28 rounded-xl border border-border/60 bg-white dark:bg-card hover:border-border hover:shadow-md transition-all duration-200 hover:scale-105 px-3"
                >
                  {b.logo_url ? (
                    <img
                      src={b.logo_url}
                      alt={b.name}
                      className="h-7 w-auto max-w-full object-contain opacity-80 hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-heading text-[11px] font-bold text-foreground/70 whitespace-nowrap text-center">
                      {b.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="grid grid-cols-5 h-14">
          <Link to="/" className="flex flex-col items-center justify-center gap-0.5 text-primary">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-[9px] font-semibold">Início</span>
          </Link>
          <Link to="/seguranca" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[9px] font-medium">Segurança</span>
          </Link>
          <Link to="/escritorio" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <Monitor className="h-5 w-5" />
            <span className="text-[9px] font-medium">Informática</span>
          </Link>
          <Link to="/economato" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <Package className="h-5 w-5" />
            <span className="text-[9px] font-medium">Economato</span>
          </Link>
          <button onClick={() => setIsOpen(true)} className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute top-1.5 right-3 bg-primary text-primary-foreground text-[8px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
            <span className="text-[9px] font-medium">Orçamento</span>
          </button>
        </div>
      </nav>

      {/* ── VISTOS RECENTEMENTE (primeiro para utilizadores recorrentes) ── */}
      {recentlyViewed.length > 0 && (
        <section className="px-3 pb-5 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <History className="h-4 w-4 text-muted-foreground" /> Vistos Recentemente
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recentlyViewed.slice(0, 4).map((p: any) => (
              <ProductCard
                key={p.id}
                id={p.id} name={p.name} sku={p.sku} slug={p.slug}
                description={p.short_description ?? null}
                category={p.category} price={p.price}
                imageUrl={p.image_url} images={[]}
                familyName={null} brandName={p.brand || null}
                featured={false} stockStatus={p.stock_status}
                minSaleQty={p.min_sale_qty ?? null}
                onClick={() => navigate(`/produto/${p.slug ?? p.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── MAIS VISTOS — linha horizontal ── */}
      {(maisVistos.isError || (maisVistos.data && maisVistos.data.length > 0)) && (
        <section className="px-3 pb-5 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" /> Mais Vistos
            </h2>
          </div>
          {maisVistos.isError ? (
            <QueryError size="sm" message="Não foi possível carregar os mais vistos." onRetry={() => maisVistos.refetch()} />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {maisVistos.data!.slice(0, 6).map((p: any) => (
                <div key={p.id} className="shrink-0 w-44">
                  <ProductCard
                    id={p.id} name={p.name} sku={p.sku} slug={p.slug}
                    description={p.short_description ?? p.description}
                    category={p.category} price={p.price}
                    imageUrl={p.image_url ?? p.image_url_snapshot} images={[]}
                    familyName={null} brandName={p.brand || null}
                    featured={false} stockStatus={p.stock_status}
                    minSaleQty={p.min_sale_qty ?? null}
                    onClick={() => navigate(`/produto/${p.slug ?? p.id}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── INCENTIVO CONTA — 1 linha discreta ── */}
      <div className="px-3 pb-4 max-w-[1600px] mx-auto w-full text-center text-[11px] text-muted-foreground">
        <Link to="/registo" className="hover:text-primary transition-colors">
          Registe-se gratuitamente para acompanhar os seus orçamentos e histórico de encomendas →
        </Link>
      </div>

      {/* ── TRUST STRIP ── */}
      <section className="border-t border-border py-5 px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-[1600px] mx-auto">
          {[
            { icon: "🛠️", title: "Instalação disponível", desc: "Serviço opcional, sob consulta" },
            { icon: "📋", title: "Orçamento gratuito", desc: "Resposta rápida e sem compromisso" },
            { icon: "🔧", title: "Suporte pós-venda", desc: "Acompanhamento contínuo" },
            { icon: "📍", title: "Montijo & região", desc: "Rua Luís Calado Nunes 15, Loja B · Montijo" },
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
              <span className="text-xl shrink-0">{t.icon}</span>
              <div>
                <p className="text-xs font-bold text-foreground leading-tight">{t.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS (linha compacta) ── */}
      <section className="border-t border-border bg-muted/30 py-4 px-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs">
          <span className="font-semibold text-foreground">Como funciona:</span>
          {[
            { n: "1", icon: Search, t: "Explore" },
            { n: "2", icon: ShoppingCart, t: "Selecciona" },
            { n: "3", icon: Send, t: "Recebe orçamento" },
          ].map((s, i, arr) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{s.n}</span>
                <s.icon className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{s.t}</span>
              </div>
              {i < arr.length - 1 && <span className="hidden sm:inline text-border">→</span>}
            </div>
          ))}
        </div>
      </section>


      {/* ── FOOTER ── */}
      <SiteFooter />

      {/* Espaço para a bottom nav no mobile */}
      <div className="h-14 sm:hidden" />

      <CartDrawer />
      <ContactFloatingBubble />
    </div>
  );
};

// ── WORLD BUTTON ──────────────────────────────────────────────────────────────

// ── HERO ROTATIVO ─────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  {
    color: "text-world-seg",
    bg: "from-world-seg/10 via-world-seg/4 to-background",
    badge: "bg-world-seg/10 border-world-seg/20 text-world-seg",
    label: "Segurança & Redes",
    desc: "Soluções de videovigilância, controlo de acessos e infraestrutura de rede para empresas.",
    iconColor: "text-world-seg",
    // Ícones: câmara, cadeado, wifi, shield
    bgIcons: [
      { Icon: Camera,     size: 96, top: "8%",  right: "6%",  opacity: 0.10, rotate: -12 },
      { Icon: Lock,       size: 64, top: "55%", right: "18%", opacity: 0.07, rotate: 8  },
      { Icon: Wifi,       size: 52, top: "20%", right: "22%", opacity: 0.06, rotate: 0  },
      { Icon: ShieldCheck,size: 40, top: "70%", right: "5%",  opacity: 0.05, rotate: 15 },
    ],
  },
  {
    color: "text-world-esc",
    bg: "from-world-esc/10 via-world-esc/4 to-background",
    badge: "bg-world-esc/10 border-world-esc/20 text-world-esc",
    label: "Informática & Tecnologia",
    desc: "Portáteis, desktops, periféricos e software. Equipamento certificado para a sua empresa.",
    iconColor: "text-world-esc",
    bgIcons: [
      { Icon: Monitor,    size: 96, top: "8%",  right: "5%",  opacity: 0.10, rotate: -6  },
      { Icon: Cpu,        size: 64, top: "55%", right: "20%", opacity: 0.07, rotate: 12  },
      { Icon: Printer,    size: 52, top: "18%", right: "22%", opacity: 0.06, rotate: -4  },
      { Icon: Tablet,     size: 40, top: "72%", right: "6%",  opacity: 0.05, rotate: -10 },
    ],
  },
  {
    color: "text-world-eco",
    bg: "from-world-eco/10 via-world-eco/4 to-background",
    badge: "bg-world-eco/10 border-world-eco/20 text-world-eco",
    label: "Economato",
    desc: "Papel, toners, mobiliário e tudo o que o seu escritório precisa no dia-a-dia.",
    iconColor: "text-world-eco",
    bgIcons: [
      { Icon: Package,    size: 96, top: "8%",  right: "5%",  opacity: 0.10, rotate: 8   },
      { Icon: Printer,    size: 64, top: "55%", right: "20%", opacity: 0.07, rotate: -8  },
      { Icon: ShoppingBag,size: 52, top: "18%", right: "22%", opacity: 0.06, rotate: 5   },
      { Icon: Star,       size: 36, top: "74%", right: "7%",  opacity: 0.05, rotate: 20  },
    ],
  },
];

function HeroRotativo() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % HERO_SLIDES.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const s = HERO_SLIDES[idx];

  return (
    <section className={`relative overflow-hidden border-b border-border py-6 px-4 bg-gradient-to-r ${s.bg} transition-all duration-500`}>
      {/* Padrão de pontos subtil */}
      <div aria-hidden className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

      {/* Ícones de fundo — lado direito */}
      <div aria-hidden className={`hidden sm:block absolute inset-0 pointer-events-none transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        {s.bgIcons.map(({ Icon, size, top, right, opacity, rotate }, i) => (
          <Icon
            key={i}
            className={`absolute ${s.iconColor}`}
            style={{
              width: size, height: size,
              top, right,
              opacity,
              transform: `rotate(${rotate}deg)`,
              strokeWidth: 1,
            }}
          />
        ))}
      </div>

      {/* Conteúdo */}
      <div className="relative max-w-2xl mx-auto text-center flex flex-col items-center gap-2">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold ${s.badge} ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}
          style={{ transition: "opacity 300ms, transform 300ms" }}>
          <Zap className="h-3 w-3" />
          Catálogo Online VRCF · Montijo
        </div>
        <h1
          className={`font-heading text-xl sm:text-2xl font-bold tracking-tight ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
          style={{ transition: "opacity 300ms ease, transform 300ms ease" }}>
          <span className={s.color}>{s.label}</span>
        </h1>
        <p
          className={`text-muted-foreground text-xs sm:text-sm max-w-md ${visible ? "opacity-100" : "opacity-0"}`}
          style={{ transition: "opacity 300ms ease" }}>
          {s.desc}
        </p>
        {/* Indicadores */}
        <div className="flex gap-1.5 mt-1">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setVisible(false); setTimeout(() => { setIdx(i); setVisible(true); }, 300); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? `w-5 ${i === 0 ? "bg-world-seg" : i === 1 ? "bg-world-esc" : "bg-world-eco"}` : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── WORLD BUTTON ──────────────────────────────────────────────────────────────

function WorldBtn({ active, onClick, to, icon: Icon, label, count, color }: {
  active: boolean; onClick: () => void; to: string;
  icon: any; label: string; count?: number; color: "orange" | "blue" | "green";
}) {
  // Cores proprietárias VRCF — definidas no index.css como variáveis CSS
  const cm = {
    orange: {
      // Ativo: gradiente do laranja VRCF (mais quente que orange-500)
      activeBg:     "bg-world-seg",
      activeGrad:   "from-world-seg to-world-seg-dark",
      activeShadow: "world-btn-seg-shadow",
      // Inativo: subtil, com acento da cor do mundo
      inactiveBorder: "border-world-seg/25 hover:border-world-seg/50",
      inactiveIcon:   "bg-world-seg/8 text-world-seg",
      inactiveText:   "text-world-seg",
      // Badge de contagem
      countActive:  "text-white/65",
      countInactive:"text-muted-foreground",
    },
    blue: {
      activeBg:     "bg-world-esc",
      activeGrad:   "from-world-esc to-world-esc-dark",
      activeShadow: "world-btn-esc-shadow",
      inactiveBorder: "border-world-esc/25 hover:border-world-esc/50",
      inactiveIcon:   "bg-world-esc/8 text-world-esc",
      inactiveText:   "text-world-esc",
      countActive:  "text-white/65",
      countInactive:"text-muted-foreground",
    },
    green: {
      activeBg:     "bg-world-eco",
      activeGrad:   "from-world-eco to-world-eco-dark",
      activeShadow: "world-btn-eco-shadow",
      inactiveBorder: "border-world-eco/25 hover:border-world-eco/50",
      inactiveIcon:   "bg-world-eco/8 text-world-eco",
      inactiveText:   "text-world-eco",
      countActive:  "text-white/65",
      countInactive:"text-muted-foreground",
    },
  }[color];

  if (active) {
    return (
      <div
        onClick={onClick}
        className={`relative rounded-2xl cursor-pointer overflow-hidden bg-gradient-to-br ${cm.activeGrad} select-none world-btn-glass ${cm.activeShadow}`}>
        {/* Reflexo diagonal — efeito de profundidade sem ser metalizado */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10 pointer-events-none rounded-2xl" />
        {/* Linha de brilho no topo */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        <div className="p-4 relative">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl mb-3 bg-white/15 backdrop-blur-sm border border-white/20">
            <Icon className="h-6 w-6 text-white drop-shadow-sm" />
          </div>
          <p className="font-bold text-sm text-white leading-tight drop-shadow-sm">{label}</p>
          {count != null && (
            <p className={`text-[10px] mt-0.5 ${cm.countActive}`}>{count.toLocaleString()} produtos</p>
          )}
          <Link to={to} onClick={e => e.stopPropagation()}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white/85 hover:text-white transition-colors">
            Explorar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border cursor-pointer overflow-hidden bg-card/80 select-none world-btn-glass ${cm.inactiveBorder}`}>
      {/* Reflexo muito subtil no inativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded-2xl" />

      <div className="p-4 relative">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl mb-3 ${cm.inactiveIcon} border border-current/10`}>
          <Icon className="h-6 w-6" />
        </div>
        <p className="font-bold text-sm text-foreground leading-tight">{label}</p>
        {count != null && (
          <p className={`text-[10px] mt-0.5 ${cm.countInactive}`}>{count.toLocaleString()} produtos</p>
        )}
        <Link to={to} onClick={e => e.stopPropagation()}
          className={`mt-3 inline-flex items-center gap-1 text-[11px] font-bold transition-colors ${cm.inactiveText}`}>
          Explorar <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export default Index;
