import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Monitor, ArrowRight, ShoppingCart, Phone, Mail, MapPin,
  Search, Send, Sparkles, Star, Package, ChevronLeft, ChevronRight, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { useCart } from "@/contexts/CartContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryMeta } from "@/lib/categoryIcons";
import vrcfLogo from "@/assets/vrcf-logo.png";
import vrcfShield from "@/assets/vrcf-shield.png";

// ── DATA HOOKS ──────────────────────────────────────────────────────────────

const useWorldData = (mundo: "seguranca" | "escritorio") =>
  useQuery({
    queryKey: ["world-data", mundo],
    queryFn: async () => {
      const [{ count }, { data: cats }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true })
          .eq("mundo", mundo).eq("include_in_catalog", true),
        supabase.from("categories").select("name, mundo")
          .in("mundo", [mundo, "todos"]).eq("visivel", true).order("ordem").limit(6),
      ]);
      return { count: count ?? 0, categories: cats ?? [] };
    },
    staleTime: 5 * 60 * 1000,
  });

const useFeaturedProducts = () =>
  useQuery({
    queryKey: ["homepage-featured-v3"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*")
        .eq("show_on_homepage", true).eq("include_in_catalog", true)
        .order("created_at", { ascending: false }).limit(8);
      if (data && data.length > 0) return data;
      const { data: fb } = await supabase.from("products").select("*")
        .eq("featured", true).eq("include_in_catalog", true)
        .order("created_at", { ascending: false }).limit(8);
      return fb ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

const useBrands = () =>
  useQuery({
    queryKey: ["homepage-brands-v3"],
    queryFn: async () => {
      const { data: highlights } = await (supabase as any)
        .from("homepage_highlights").select("ref_id, label, position")
        .eq("type", "brand").eq("active", true).order("position").limit(12);
      if (highlights && highlights.length > 0) return highlights;
      const { data: brands } = await supabase.from("brands").select("id, name, logo_url").order("name").limit(12);
      return (brands ?? []).map((b: any) => ({ ref_id: b.id, label: b.name, logo: b.logo_url }));
    },
    staleTime: 5 * 60 * 1000,
  });

const useBanners = () =>
  useQuery({
    queryKey: ["banners-home-v3"],
    queryFn: async () => {
      const { data } = await supabase.from("banners").select("*")
        .eq("ativo", true).in("mundo", ["todos"]).order("ordem");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

// ── COMPONENT ───────────────────────────────────────────────────────────────

const Index = () => {
  const { totalItems, setIsOpen } = useCart();
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);
  const navigate = useNavigate();
  const seg = useWorldData("seguranca");
  const esc = useWorldData("escritorio");
  const featured = useFeaturedProducts();
  const brands = useBrands();
  const banners = useBanners();
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!banners.data || banners.data.length <= 1) return;
    timerRef.current = setInterval(() => setBannerIdx(i => (i + 1) % banners.data!.length), 5000);
    return () => clearInterval(timerRef.current);
  }, [banners.data]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    if (!q) return;
    navigate(`/pesquisa?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>VRCF Showroom — Segurança, Redes, Escritório & IT | Montijo</title>
        <meta name="description" content="Catálogo profissional VRCF: videovigilância, redes, equipamento informático recondicionado e soluções de segurança. Peça orçamento online." />
        <link rel="canonical" href="https://showroom.vrcf.info/" />
      </Helmet>

      <WelcomeBanner />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5">
          <Link to="/" className="shrink-0">
            <img src={vrcfLogo} alt="VRCF" className="h-9 sm:h-11 w-auto" />
          </Link>
          <form onSubmit={submitSearch} className="relative flex-1 max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar câmaras, portáteis, switches, alarmes..."
              value={heroQuery} onChange={e => setHeroQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-border focus:bg-card text-sm" />
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
            <Link to="/login" className="hidden md:inline text-xs text-muted-foreground hover:text-foreground transition-colors">Admin</Link>
          </div>
        </div>
      </header>

      {/* ── BANNERS ── */}
      {banners.data && banners.data.length > 0 && (
        <div className="relative">
          <div className="relative overflow-hidden" style={{ maxHeight: "280px" }}>
            {banners.data.map((b: any, i: number) => (
              <div key={b.id} className={`transition-opacity duration-500 ${i === bannerIdx ? "opacity-100" : "opacity-0 absolute inset-0"}`}>
                {b.link ? (
                  <Link to={b.link}><img src={b.image_url} alt={b.titulo || ""} className="w-full object-cover" style={{ maxHeight: "280px" }} /></Link>
                ) : (
                  <img src={b.image_url} alt={b.titulo || ""} className="w-full object-cover" style={{ maxHeight: "280px" }} />
                )}
              </div>
            ))}
            {banners.data.length > 1 && (
              <>
                <button onClick={() => setBannerIdx(i => (i - 1 + banners.data!.length) % banners.data!.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setBannerIdx(i => (i + 1) % banners.data!.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {banners.data.map((_: any, i: number) => (
                    <button key={i} onClick={() => setBannerIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      {(!banners.data || banners.data.length === 0) && (
        <section className="border-b border-border bg-gradient-to-br from-background via-background to-muted/40 py-10 sm:py-14">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-5">
              <Zap className="h-3 w-3" /> Catálogo Online · VRCF Montijo
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Tecnologia &<br className="sm:hidden" /> Segurança
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-7 max-w-xl mx-auto">
              Câmaras, alarmes, redes, computadores recondicionados e muito mais. Peça orçamento online.
            </p>
            <form onSubmit={submitSearch} className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="O que procura? Ex: câmara Hikvision, portátil HP..."
                value={heroQuery} onChange={e => setHeroQuery(e.target.value)}
                className="pl-12 pr-32 h-12 text-sm bg-card border-border shadow-sm rounded-xl" />
              <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-lg text-xs">
                Pesquisar
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* ── WORLD CARDS ── */}
      <section className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorldCard
          to="/seguranca"
          mundo="seguranca"
          title="Segurança & Redes"
          subtitle="Videovigilância, alarmes, controlo de acessos e redes profissionais."
          count={seg.data?.count}
          categories={seg.data?.categories ?? []}
        />
        <WorldCard
          to="/escritorio"
          mundo="escritorio"
          title="Escritório & IT"
          subtitle="Computadores recondicionados, periféricos e soluções IT."
          count={esc.data?.count}
          categories={esc.data?.categories ?? []}
        />
      </section>

      {/* ── MARCAS ── */}
      {brands.data && brands.data.length > 0 && (
        <section className="border-t border-border bg-muted/20 py-8">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-6">Marcas que trabalhamos</p>
            <div className="flex flex-wrap justify-center gap-3">
              {brands.data.map((b: any) => (
                <Link key={b.ref_id} to={`/seguranca?marca=${b.ref_id}`}
                  className="group px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{b.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PRODUTOS EM DESTAQUE ── */}
      {featured.data && featured.data.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-6 max-w-6xl mx-auto">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-primary" /> Em destaque
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {featured.data.slice(0, 8).map((p: any) => (
              <Link key={p.id} to={`/produto/${p.slug ?? p.id}`} className="contents">
                <ProductCard id={p.id} name={p.name}
                  description={p.short_description ?? p.description}
                  category={p.category} price={p.price}
                  imageUrl={p.image_url} images={[]}
                  familyName={null} featured={p.featured} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── COMO FUNCIONA ── */}
      <section className="bg-zinc-900 dark:bg-black text-white py-14 mt-4">
        <div className="container mx-auto px-4 max-w-4xl">
          <h3 className="text-center font-heading text-2xl sm:text-3xl font-bold mb-2">Como funciona</h3>
          <p className="text-center text-zinc-400 text-sm mb-10 max-w-md mx-auto">Orçamento rápido, sem complicações.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Search, title: "Explore", desc: "Pesquise ou navegue por categoria ou marca.", n: "01" },
              { icon: ShoppingCart, title: "Seleccione", desc: "Adicione produtos ao pedido de orçamento.", n: "02" },
              { icon: Send, title: "Receba", desc: "Enviamos proposta com preços actualizados.", n: "03" },
            ].map((s, i) => (
              <div key={i} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-primary/50 hover:bg-white/[0.05] transition-all relative overflow-hidden">
                <span className="absolute top-3 right-4 text-4xl font-bold text-white/[0.04] group-hover:text-primary/15 transition-colors font-heading">{s.n}</span>
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-base mb-1">{s.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={vrcfShield} alt="VRCF" className="h-10 w-auto" />
            <div>
              <p className="font-bold text-sm">VRCF — Informática & Segurança</p>
              <p className="text-xs text-muted-foreground">NIF 515237205 · Montijo, Portugal</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href="tel:+351911564243" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Phone className="h-3.5 w-3.5" /> +351 911 564 243
            </a>
            <a href="mailto:geral@vrcf.pt" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Mail className="h-3.5 w-3.5" /> geral@vrcf.pt
            </a>
            <a href="https://maps.google.com/?q=Rua+Luis+Calado+Nunes+15+Montijo" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <MapPin className="h-3.5 w-3.5" /> Rua Luis Calado Nunes 15 LJ B
            </a>
          </div>
          <div className="text-xs text-muted-foreground flex gap-3">
            <Link to="/termos-e-condicoes" className="hover:text-primary transition-colors">Termos</Link>
            <Link to="/politica-de-cookies" className="hover:text-primary transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>

      <CartDrawer />
      <ContactFloatingBubble />
      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </div>
  );
};

// ── WORLD CARD ───────────────────────────────────────────────────────────────

function WorldCard({ to, mundo, title, subtitle, count, categories }: {
  to: string; mundo: "seguranca" | "escritorio";
  title: string; subtitle: string; count?: number; categories: any[];
}) {
  const isS = mundo === "seguranca";
  return (
    <div className={`group relative overflow-hidden rounded-3xl border border-border min-h-[340px] flex flex-col transition-all hover:shadow-xl hover:border-${isS ? "primary" : "blue-500"}/40`}>

      {/* Ilustração SVG */}
      <div className="absolute inset-0">
        {isS ? <SecurityIllustration /> : <OfficeIllustration />}
      </div>

      {/* Overlay gradiente */}
      <div className={`absolute inset-0 ${isS
        ? "bg-gradient-to-t from-[#2d0e00]/95 via-[#2d0e00]/65 to-[#2d0e00]/20"
        : "bg-gradient-to-t from-[#001433]/95 via-[#001433]/65 to-[#001433]/20"
      }`} />

      {/* Conteúdo */}
      <div className="relative flex flex-col h-full p-7 sm:p-8 justify-between">
        {/* Topo */}
        <div>
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border mb-4 ${isS
            ? "bg-primary/20 border-primary/40 text-primary"
            : "bg-blue-500/20 border-blue-400/40 text-blue-400"
          }`}>
            {isS ? <ShieldCheck className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-white/65 max-w-xs leading-relaxed">{subtitle}</p>
          {count != null && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 w-fit">
              <Package className="h-3 w-3 text-white/60" />
              <span className="text-xs font-medium text-white/80">{count.toLocaleString()} produtos</span>
            </div>
          )}
        </div>

        {/* Categorias rápidas */}
        {categories.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-2.5">Categorias</p>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 5).map((c: any) => {
                const meta = getCategoryMeta(c.name);
                return (
                  <Link key={c.name} to={`${to}?categoria=${encodeURIComponent(c.name)}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 hover:bg-white/20 transition-all text-xs font-medium text-white/80 hover:text-white">
                    <span>{c.name}</span>
                  </Link>
                );
              })}
              <Link to={to} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isS
                ? "bg-primary/25 border border-primary/40 text-primary hover:bg-primary/35"
                : "bg-blue-500/25 border border-blue-400/40 text-blue-300 hover:bg-blue-500/35"
              }`}>
                Ver tudo <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* CTA */}
        <Link to={to} className={`mt-5 inline-flex items-center gap-2 font-semibold text-sm transition-all group-hover:gap-3 ${isS ? "text-primary" : "text-blue-400"}`}>
          Explorar catálogo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── SVG ILLUSTRATIONS ────────────────────────────────────────────────────────

function SecurityIllustration() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 600 340" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="600" height="340" fill="#1c0500"/>
      {/* Grid */}
      <g opacity="0.08" stroke="#E87722" strokeWidth="0.5">
        {[1,2,3,4,5,6,7,8,9,10,11].map(i=><line key={`h${i}`} x1="0" y1={i*30} x2="600" y2={i*30}/>)}
        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].map(i=><line key={`v${i}`} x1={i*32} y1="0" x2={i*32} y2="340"/>)}
      </g>
      {/* Camera dome body */}
      <ellipse cx="430" cy="105" rx="60" ry="22" fill="#E87722" fillOpacity="0.1" stroke="#E87722" strokeOpacity="0.35" strokeWidth="1.5"/>
      <path d="M390 105 Q390 145 430 155 Q470 145 470 105 Z" fill="#E87722" fillOpacity="0.15" stroke="#E87722" strokeOpacity="0.4" strokeWidth="1.5"/>
      {/* Lens */}
      <circle cx="430" cy="122" r="14" fill="#E87722" fillOpacity="0.25" stroke="#E87722" strokeOpacity="0.6" strokeWidth="2"/>
      <circle cx="430" cy="122" r="8" fill="#E87722" fillOpacity="0.5" stroke="#E87722" strokeOpacity="0.8" strokeWidth="1.5"/>
      <circle cx="430" cy="122" r="4" fill="#E87722" fillOpacity="0.9"/>
      <circle cx="425" cy="117" r="2.5" fill="white" fillOpacity="0.3"/>
      {/* Mount */}
      <rect x="427" y="155" width="6" height="22" rx="2" fill="#E87722" fillOpacity="0.4"/>
      {/* Signal rings */}
      <ellipse cx="430" cy="92" rx="30" ry="12" fill="none" stroke="#E87722" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="5 4"/>
      <ellipse cx="430" cy="85" rx="50" ry="20" fill="none" stroke="#E87722" strokeOpacity="0.11" strokeWidth="1" strokeDasharray="5 4"/>
      <ellipse cx="430" cy="78" rx="72" ry="28" fill="none" stroke="#E87722" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="5 4"/>
      {/* Shield */}
      <path d="M115 72 L155 58 L195 72 L195 122 Q195 148 155 162 Q115 148 115 122 Z" fill="#E87722" fillOpacity="0.08" stroke="#E87722" strokeOpacity="0.4" strokeWidth="1.5"/>
      <path d="M134 108 L148 122 L176 94" fill="none" stroke="#E87722" strokeOpacity="0.85" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Network hub */}
      <circle cx="300" cy="205" r="10" fill="#E87722" fillOpacity="0.2" stroke="#E87722" strokeOpacity="0.5" strokeWidth="2"/>
      <circle cx="300" cy="205" r="4" fill="#E87722" fillOpacity="0.7"/>
      {/* Nodes */}
      {[[220,250],[380,250],[160,215],[440,220],[260,285],[340,285]].map(([x,y],i)=>(
        <g key={`n${i}`}>
          <circle cx={x} cy={y} r={i<2?7:5} fill="#E87722" fillOpacity="0.15" stroke="#E87722" strokeOpacity="0.3" strokeWidth="1"/>
          <circle cx={x} cy={y} r={i<2?3:2} fill="#E87722" fillOpacity="0.5"/>
        </g>
      ))}
      {/* Network lines */}
      {[[300,205,220,250],[300,205,380,250],[220,250,160,215],[380,250,440,220],[220,250,260,285],[380,250,340,285]].map(([x1,y1,x2,y2],i)=>(
        <line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E87722" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="5 3"/>
      ))}
      <line x1="300" y1="205" x2="430" y2="177" stroke="#E87722" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="5 3"/>
      {/* Lock */}
      <rect x="268" y="275" width="64" height="44" rx="8" fill="#E87722" fillOpacity="0.1" stroke="#E87722" strokeOpacity="0.35" strokeWidth="1.5"/>
      <path d="M283 275 Q283 257 300 257 Q317 257 317 275" fill="none" stroke="#E87722" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="300" cy="294" r="6" fill="#E87722" fillOpacity="0.5"/>
      <rect x="297" y="294" width="6" height="9" rx="2" fill="#E87722" fillOpacity="0.5"/>
      {/* Accent dots */}
      {[[45,35],[555,55],[55,300],[545,285],[300,30],[520,175]].map(([x,y],i)=>(
        <circle key={`d${i}`} cx={x} cy={y} r={i%2===0?2.5:1.5} fill="#E87722" fillOpacity="0.25"/>
      ))}
      {/* Glow */}
      <ellipse cx="430" cy="110" rx="100" ry="50" fill="#E87722" fillOpacity="0.04"/>
    </svg>
  );
}

function OfficeIllustration() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 600 340" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="600" height="340" fill="#000d1f"/>
      {/* Grid */}
      <g opacity="0.08" stroke="#3B82F6" strokeWidth="0.5">
        {[1,2,3,4,5,6,7,8,9,10,11].map(i=><line key={`h${i}`} x1="0" y1={i*30} x2="600" y2={i*30}/>)}
        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].map(i=><line key={`v${i}`} x1={i*32} y1="0" x2={i*32} y2="340"/>)}
      </g>
      {/* Monitor */}
      <rect x="220" y="70" width="160" height="108" rx="7" fill="#3B82F6" fillOpacity="0.09" stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1.5"/>
      <rect x="230" y="80" width="140" height="82" rx="4" fill="#3B82F6" fillOpacity="0.06" stroke="#3B82F6" strokeOpacity="0.2" strokeWidth="0.5"/>
      {/* Screen content */}
      {[[0,70,0.45],[10,65,0.3],[0,55,0.38],[15,80,0.25],[0,48,0.35]].map(([off,w,op],i)=>(
        <rect key={`sc${i}`} x={240+off} y={90+i*13} width={w} height="3.5" rx="1.75" fill="#3B82F6" fillOpacity={op}/>
      ))}
      <rect x="240" y="148" width="45" height="8" rx="4" fill="#3B82F6" fillOpacity="0.55"/>
      {/* Stand */}
      <rect x="293" y="178" width="14" height="20" rx="3" fill="#3B82F6" fillOpacity="0.25"/>
      <rect x="278" y="198" width="44" height="6" rx="3" fill="#3B82F6" fillOpacity="0.2"/>
      {/* Laptop */}
      <rect x="72" y="148" width="120" height="78" rx="5" fill="#3B82F6" fillOpacity="0.08" stroke="#3B82F6" strokeOpacity="0.35" strokeWidth="1.5"/>
      <rect x="82" y="157" width="100" height="60" rx="3" fill="#3B82F6" fillOpacity="0.05"/>
      {[[0,52],[0,68],[10,44]].map(([off,w],i)=>(
        <rect key={`ls${i}`} x={92} y={165+i*11} width={w} height="2.5" rx="1.25" fill="#3B82F6" fillOpacity="0.25"/>
      ))}
      <rect x="72" y="226" width="120" height="10" rx="3" fill="#3B82F6" fillOpacity="0.12" stroke="#3B82F6" strokeOpacity="0.25" strokeWidth="1"/>
      {/* Keyboard dots */}
      {[0,1,2,3,4,5,6,7,8].map(i=>(
        <rect key={`kb${i}`} x={82+i*12} y="231" width="9" height="5" rx="1.5" fill="#3B82F6" fillOpacity="0.12"/>
      ))}
      {/* Server */}
      <rect x="418" y="90" width="80" height="125" rx="7" fill="#3B82F6" fillOpacity="0.07" stroke="#3B82F6" strokeOpacity="0.35" strokeWidth="1.5"/>
      {[0,1,2,3,4].map(i=>(
        <rect key={`sv${i}`} x="428" y={103+i*19} width="60" height="12" rx="2.5" fill="#3B82F6" fillOpacity="0.12" stroke="#3B82F6" strokeOpacity="0.2" strokeWidth="0.5"/>
      ))}
      <circle cx="458" cy="205" r="6" fill="#3B82F6" fillOpacity="0.25" stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1"/>
      <circle cx="455" cy="202" r="2" fill="white" fillOpacity="0.2"/>
      {/* Connection lines */}
      <line x1="192" y1="187" x2="220" y2="127" stroke="#3B82F6" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="5 3"/>
      <line x1="380" y1="127" x2="418" y2="155" stroke="#3B82F6" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="5 3"/>
      {/* Chip */}
      <rect x="462" y="32" width="70" height="70" rx="5" fill="#3B82F6" fillOpacity="0.07" stroke="#3B82F6" strokeOpacity="0.25" strokeWidth="1"/>
      <rect x="475" y="45" width="44" height="44" rx="4" fill="#3B82F6" fillOpacity="0.09" stroke="#3B82F6" strokeOpacity="0.35" strokeWidth="1"/>
      <rect x="485" y="55" width="24" height="24" rx="3" fill="#3B82F6" fillOpacity="0.18"/>
      {[0,1,2].map(i=>(
        <g key={`cp${i}`}>
          <line x1="464" y1={52+i*12} x2="475" y2={52+i*12} stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1"/>
          <line x1="519" y1={52+i*12} x2="532" y2={52+i*12} stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1"/>
        </g>
      ))}
      {/* Glow */}
      <ellipse cx="300" cy="155" rx="160" ry="90" fill="#3B82F6" fillOpacity="0.03"/>
      {/* Accent dots */}
      {[[35,35],[560,50],[55,290],[550,280],[300,25],[415,275]].map(([x,y],i)=>(
        <circle key={`d${i}`} cx={x} cy={y} r={i%2===0?2.5:1.5} fill="#3B82F6" fillOpacity="0.22"/>
      ))}
    </svg>
  );
}

export default Index;
