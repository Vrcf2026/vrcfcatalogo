import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Monitor, Search, ShoppingCart,
  ArrowRight, ChevronLeft, ChevronRight, Star, Package, Send, Zap,
  Wifi, Camera, Lock, Cpu, Printer, Tablet, ShoppingBag,
  TrendingUp, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      const { data } = await q;
      if (data && data.length > 0) return data;
      let q2 = supabase.from("products").select("*")
        .eq("include_in_catalog", true)
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (mundo) q2 = (q2 as any).eq("mundo", mundo);
      const { data: fb } = await q2;
      return fb ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

const useCategories = (mundo: string) =>
  useQuery({
    queryKey: ["hp-categories", mundo],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*")
        .in("mundo", [mundo, "todos"]).eq("visivel", true)
        .order("ordem");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

const useWorldCount = (mundo: string) =>
  useQuery({
    queryKey: ["hp-count", mundo],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true })
        .eq("mundo", mundo).eq("include_in_catalog", true);
      return count ?? 0;
    },
    staleTime: 10 * 60 * 1000,
  });

const useBrands = () =>
  useQuery({
    queryKey: ["hp-brands"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("id,name,logo_url")
        .eq("show_on_homepage", true).order("name").limit(16);
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

const useBanners = () =>
  useQuery({
    queryKey: ["hp-banners"],
    queryFn: async () => {
      const { data } = await supabase.from("banners").select("*")
        .eq("ativo", true).in("mundo", ["todos", "homepage"]).order("ordem");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

// ── COMPONENT ─────────────────────────────────────────────────────────────────

// Hook: Novidades (últimos produtos importados, qualquer mundo)
const useNovidades = () =>
  useQuery({
    queryKey: ["hp-novidades"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select(
        "id,name,slug,price,image_url,stock_status,category,brand,mundo,min_sale_qty,short_description,sku"
      ).eq("include_in_catalog", true)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

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
    timerRef.current = setInterval(() => setBannerIdx(i => (i + 1) % banners.data!.length), 5000);
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
        <title>VRCF Showroom — Segurança, Redes, Informática & Tecnologia | Montijo</title>
        <meta name="description" content="Catálogo VRCF: câmaras, alarmes, redes, computadores recondicionados. Peça orçamento online." />
      </Helmet>

      <WelcomeBanner />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2 max-w-screen-xl mx-auto">
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

      {/* ── HERO COMPACTO (pesquisa já está no header) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background to-muted/40 border-b border-border py-4 px-4">
        <div aria-hidden className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative max-w-2xl mx-auto text-center flex flex-col items-center gap-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold">
            <Zap className="h-3 w-3" /> Catálogo Online VRCF · Montijo
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight">
            Tecnologia & Segurança
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Câmaras, alarmes, redes e IT recondicionado. Peça orçamento online.</p>
        </div>
      </section>


      {/* ── BANNERS (adicional, abaixo do título) ── */}
      {banners.data && banners.data.length > 0 && (
        <div className="relative overflow-hidden bg-black min-h-[110px]" style={{ aspectRatio: "1200 / 300" }}>
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
              <button onClick={() => setBannerIdx(i => (i - 1 + banners.data!.length) % banners.data!.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setBannerIdx(i => (i + 1) % banners.data!.length)}
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
      )}

      {/* ── WORLD SELECTOR ── */}
      <section className="px-3 pt-4 pb-2 max-w-screen-xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-3">
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
        <section className="px-3 pb-3 max-w-screen-xl mx-auto w-full">
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
                  className="shrink-0 flex flex-col items-center gap-1.5 p-2.5 w-[76px] h-[76px] rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${meta.bg}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <span className="text-[9px] font-semibold text-foreground text-center leading-tight line-clamp-2">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      {featured.data && featured.data.length > 0 && (
        <section className="px-3 pb-5 max-w-screen-xl mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Star className="h-4 w-4 text-primary fill-primary" /> Em destaque
            </h2>
            <Link to={worldPath} className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5">
              Ver mais <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
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
        </section>
      )}


      {/* ── TRUST STRIP ── */}
      <section className="border-t border-border py-5 px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-screen-xl mx-auto">
          {[
            { icon: "🛠️", title: "Instalação disponível", desc: "Serviço opcional, sob consulta" },
            { icon: "📋", title: "Orçamento gratuito", desc: "Resposta rápida e sem compromisso" },
            { icon: "🔧", title: "Suporte pós-venda", desc: "Acompanhamento contínuo" },
            { icon: "📍", title: "Montijo & região", desc: "Atendimento presencial disponível" },
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

      {/* ── BRANDS ── */}
      {brands.data && brands.data.length > 0 && (
        <section className="border-t border-border bg-muted/30 py-5 px-3">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Marcas disponíveis</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-screen-xl mx-auto">
            {brands.data.map((b: any) => (
              <Link key={b.id} to={`/pesquisa?marca=${encodeURIComponent(b.name)}`}
                className="px-3.5 py-2 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-semibold text-muted-foreground hover:text-foreground">
                {b.name}
              </Link>
            ))}
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
          <Link to="/pesquisa" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <Search className="h-5 w-5" />
            <span className="text-[9px] font-medium">Pesquisa</span>
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
        <section className="px-3 pb-5 max-w-screen-xl mx-auto w-full">
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
      {maisVistos.data && maisVistos.data.length > 0 && (
        <section className="px-3 pb-5 max-w-screen-xl mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" /> Mais Vistos
            </h2>
            <Link to="/pesquisa" className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {maisVistos.data.slice(0, 6).map((p: any) => (
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
        </section>
      )}

      {/* ── INCENTIVO CONTA — 1 linha discreta ── */}
      <div className="px-3 pb-4 max-w-screen-xl mx-auto w-full text-center text-[11px] text-muted-foreground">
        <Link to="/registo" className="hover:text-primary transition-colors">
          Registe-se gratuitamente para acompanhar os seus orçamentos e histórico de encomendas →
        </Link>
      </div>

      {/* ── HOW IT WORKS (linha compacta) ── */}
      <section className="border-t border-border bg-muted/30 py-4 px-4">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs">
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

function WorldBtn({ active, onClick, to, icon: Icon, label, count, color }: {
  active: boolean; onClick: () => void; to: string;
  icon: any; label: string; count?: number; color: "orange" | "blue" | "green";
}) {
  const cm = {
    orange: { active: "border-primary bg-primary/[0.08] shadow-primary/15 shadow-md", icon: "bg-primary/15 text-primary", link: "text-primary", dot: "bg-primary" },
    blue:   { active: "border-blue-500 bg-blue-500/[0.08] shadow-blue-500/15 shadow-md", icon: "bg-blue-500/15 text-blue-500", link: "text-blue-500", dot: "bg-blue-500" },
    green:  { active: "border-green-600 bg-green-600/[0.08] shadow-green-600/15 shadow-md", icon: "bg-green-600/15 text-green-600", link: "text-green-600", dot: "bg-green-600" },
  }[color];
  return (
    <div className={`relative rounded-2xl border-2 transition-all overflow-hidden cursor-pointer ${active ? cm.active : "border-border bg-card hover:border-muted-foreground/30"}`} onClick={onClick}>
      <div className="p-4">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${cm.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="font-bold text-sm text-foreground leading-tight">{label}</p>
        {count != null && (
          <p className="text-[10px] text-muted-foreground mt-1">{count.toLocaleString()} produtos</p>
        )}
        <Link to={to}
          onClick={e => e.stopPropagation()}
          className={`mt-3 inline-flex items-center gap-1 text-[11px] font-bold transition-colors ${cm.link}`}>
          Explorar <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {active && <div className={`absolute top-2 right-2 h-2 w-2 rounded-full ${cm.dot}`} />}
    </div>
  );
}

export default Index;
