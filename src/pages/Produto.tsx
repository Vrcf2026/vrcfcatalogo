import { useQuery } from "@tanstack/react-query";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import {
  Loader2, ArrowLeft, ShoppingCart, ShieldCheck, Package2, Search,
  MessageCircle, Copy, Truck, Clock, Info, ChevronLeft, ChevronRight,
  ZoomIn, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { UserMenuButton } from "@/components/UserMenuButton";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";
import { addToRecentlyViewed } from "@/pages/Index";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { StockAlertButton } from "@/components/StockAlertButton";
import { QueryError } from "@/components/QueryError";
import { QuantitySelector } from "@/components/QuantitySelector";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "sonner";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { SPEC_LABELS } from "@/lib/specLabels";

const STOCK_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  high:       { label: "Em stock",           color: "bg-emerald-500/12 text-emerald-700 border-emerald-500/30", dot: "bg-emerald-500" },
  low:        { label: "Últimas unidades",   color: "bg-amber-500/12 text-amber-700 border-amber-500/30",    dot: "bg-amber-500" },
  out:        { label: "Sob encomenda",       color: "bg-blue-500/12 text-blue-700 border-blue-500/30",       dot: "bg-blue-500" },
  on_request: { label: "Sob encomenda",       color: "bg-blue-500/12 text-blue-700 border-blue-500/30",       dot: "bg-blue-500" },
};

// Tradução de chaves de specs para português legível
const Produto = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, setIsOpen, totalItems } = useCart();
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ["product-slug", slug],
    queryFn: async () => {
      const { data: bySlug, error: e1 } = await supabase.from("products").select("*").eq("slug", slug!).maybeSingle();
      if (e1) throw e1;
      if (bySlug) return bySlug;
      const { data: byId, error: e2 } = await supabase.from("products").select("*").eq("id", slug!).maybeSingle();
      if (e2) throw e2;
      return byId;
    },
    enabled: !!slug,
    retry: 2,
  });

  const { data: dbImages = [] } = useQuery({
    queryKey: ["product-images", product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("product_images").select("*")
        .eq("product_id", product!.id).order("position");
      return data ?? [];
    },
    enabled: !!product?.id,
  });

  // Produtos relacionados — mesma família/categoria, excluindo o actual.
  // Prioriza: (1) mesma família, (2) mesma categoria. Limita a 4.
  const { data: related = [] } = useQuery({
    queryKey: ["related-products", product?.id, product?.family_id, product?.category],
    queryFn: async () => {
      if (!product) return [];
      // Tenta primeiro por família
      if (product.family_id) {
        const { data } = await supabase
          .from("products")
          .select("id,name,slug,price,image_url,stock_status,category,brand")
          .eq("family_id", product.family_id)
          .eq("include_in_catalog", true)
          .neq("id", product.id)
          .order("featured", { ascending: false })
          .limit(4);
        if (data && data.length >= 2) return data;
      }
      // Fallback: mesma categoria
      if (product.category) {
        const { data } = await supabase
          .from("products")
          .select("id,name,slug,price,image_url,stock_status,category,brand")
          .eq("category", product.category)
          .eq("mundo", product.mundo)
          .eq("include_in_catalog", true)
          .neq("id", product.id)
          .order("featured", { ascending: false })
          .limit(4);
        return data ?? [];
      }
      return [];
    },
    enabled: !!product?.id,
  });

  // Guardar em "vistos recentemente" (localStorage) — ANTES de qualquer early return
  useEffect(() => {
    if (product) {
      addToRecentlyViewed({
        id: product.id, name: product.name, slug: product.slug,
        price: product.price, image_url: product.image_url,
        stock_status: product.stock_status, category: product.category,
        brand: product.brand, mundo: product.mundo,
        min_sale_qty: product.min_sale_qty, sku: product.sku,
      });
    }
  }, [product?.id]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <QueryError message="Não foi possível carregar o produto. Verifique a sua ligação." onRetry={() => refetch()} />
      </div>
    </div>
  );
  if (!product) return <Navigate to="/404" replace />;

  // Produto inativo — redirect para categoria
  if (product.include_in_catalog === false) {
    const destino = product.mundo
      ? `/${product.mundo}${product.category ? `?categoria=${encodeURIComponent(product.category)}` : ""}`
      : "/";
    return <Navigate to={destino} replace />;
  }

  // Imagens — db images + imagens_extra do produto
  const extraImgs = Array.isArray(product.imagens_extra) ? product.imagens_extra : [];
  const allImages = dbImages.length > 0
    ? dbImages.sort((a: any, b: any) => a.position - b.position).map((i: any) => i.image_url)
    : product.image_url
      ? [product.image_url, ...extraImgs]
      : extraImgs;
  const currentImage = allImages[imgIdx] || null;

  let specs: Record<string, string> = {};
  if (typeof product.especificacoes === "string") {
    try {
      specs = JSON.parse(product.especificacoes || "{}");
    } catch (e) {
      console.error("especificacoes JSON malformado para produto", product.id, product.sku, e);
      specs = {};
    }
  } else if (product.especificacoes && typeof product.especificacoes === "object") {
    specs = product.especificacoes as Record<string, string>;
  }

  // Mapear valores de teclado para texto legível
  const TECLADO_DISPLAY: Record<string, string> = {
    "PT": "Português",
    "ES": "Castelhano",
    "Internacional": "Internacional",
    "Personalizável": "Personalizável",
  };

  // Filtrar specs para mostrar — excluir campos internos
  const specsToShow = Object.entries(specs).filter(([k]) =>
    !["teclado_nota", "ram_slot_livre"].includes(k) && SPEC_LABELS[k]
  );
  const specsExtra = Object.entries(specs).filter(([k]) =>
    !["teclado_nota", "ram_slot_livre"].includes(k) && !SPEC_LABELS[k]
  );

  const destaques = (product.destaques ?? []) as string[];
  const teclado_nota = destaques.find(d => d.startsWith("Teclado não"));
  const envio_especial = !!product.envio_especial;
  const stockCfg = STOCK_CONFIG[product.stock_status ?? "out"] ?? STOCK_CONFIG.out;
  const WORLD_INFO: Record<string, { path: string; label: string }> = {
    escritorio: { path: "/escritorio", label: "Escritório & IT" },
    seguranca:  { path: "/seguranca",  label: "Segurança & Redes" },
    economato:  { path: "/economato",  label: "Economato" },
  };
  const worldInfo = WORLD_INFO[product.mundo ?? ""] ?? WORLD_INFO.seguranca;
  const worldPath = worldInfo.path;

  const worldLabel = worldInfo.label;
  const priceWithVat = product.price ? product.price * 1.23 : null;
  const waText = encodeURIComponent(`Olá VRCF, quero informação sobre: ${product.name}${product.sku ? ` (Ref: ${product.sku})` : ""}`);

  const minSaleQty = product.min_sale_qty && product.min_sale_qty > 1 ? product.min_sale_qty : 1;

  const handleAddToCart = () => {
    addItem({ id: product.id, name: product.name, price: product.price, imageUrl: currentImage, category: product.category, weight: product.weight ?? null, fornecedor: product.fornecedor ?? null, envio_especial: envio_especial, minSaleQty }, minSaleQty);
    toast.success(
      minSaleQty > 1
        ? `${minSaleQty}x ${product.name} adicionado ao orçamento (embalagem mínima)`
        : `${product.name} adicionado ao orçamento`
    );
    setIsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{[product.brand, product.name, product.category, "VRCF Montijo"].filter(Boolean).join(" — ")}</title>
        <meta name="description" content={(product.short_description ?? product.description?.slice(0, 155) ?? product.name) + " | VRCF Montijo"} />
        <link rel="canonical" href={`https://catalogo.vrcf.pt/produto/${product.slug ?? product.id}`} />
        <meta property="og:type"        content="product" />
        <meta property="og:site_name"   content="VRCF Showroom" />
        <meta property="og:title"       content={`${product.name}${product.brand ? ` — ${product.brand}` : ""}`} />
        <meta property="og:description" content={product.short_description ?? product.description?.slice(0, 155) ?? product.name} />
        <meta property="og:url"         content={`https://catalogo.vrcf.pt/produto/${product.slug ?? product.id}`} />
        {currentImage && <meta property="og:image" content={currentImage} />}
        {product.brand && <meta property="product:brand" content={product.brand} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.short_description ?? product.description?.slice(0, 300) ?? product.name,
          "image": currentImage ? [currentImage] : undefined,
          "sku": product.sku ?? undefined,
          "brand": product.brand ? { "@type": "Brand", "name": product.brand } : undefined,
          "category": product.category ?? undefined,
          "itemCondition": product.fornecedor === "diginova"
            ? "https://schema.org/RefurbishedCondition"
            : "https://schema.org/NewCondition",
          "offers": product.price && Number(product.price) > 0 ? {
            "@type": "Offer",
            "url": `https://catalogo.vrcf.pt/produto/${product.slug ?? product.id}`,
            "priceCurrency": "EUR",
            "price": (Number(product.price) * 1.23).toFixed(2),
            "availability": (product.stock_status === "high" || product.stock_status === "low")
              ? "https://schema.org/InStock"
              : "https://schema.org/PreOrder",
            "seller": { "@type": "Organization", "name": "VRCF - Informática & Segurança" }
          } : undefined,
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://catalogo.vrcf.pt/" },
              product.mundo ? { "@type": "ListItem", "position": 2, "name": product.mundo === "seguranca" ? "Segurança" : product.mundo === "escritorio" ? "Informática" : "Economato", "item": `https://catalogo.vrcf.pt/${product.mundo}` } : null,
              product.category ? { "@type": "ListItem", "position": 3, "name": product.category, "item": `https://catalogo.vrcf.pt/${product.mundo}?categoria=${encodeURIComponent(product.category)}` } : null,
              { "@type": "ListItem", "position": 4, "name": product.name, "item": `https://catalogo.vrcf.pt/produto/${product.slug ?? product.id}` }
            ].filter(Boolean)
          }
        })}</script>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2 shrink-0">
            <Link to={worldPath} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <Link to="/"><img src={vrcfLogo} alt="VRCF" className="h-9 sm:h-11 w-auto" /></Link>
          </div>
          <GlobalSearchBar />
          <div className="flex items-center gap-2 shrink-0">
            <DarkModeToggle />
            <UserMenuButton />
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-1.5 h-9 relative">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Orçamento</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 py-3 text-xs text-muted-foreground flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
        <span>/</span>
        <Link to={worldPath} className="hover:text-foreground transition-colors">{worldLabel}</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              to={`${worldPath}?categoria=${encodeURIComponent(product.category)}`}
              className="hover:text-foreground transition-colors"
            >
              {product.category}
            </Link>
          </>
        )}
        {product.family && (
          <>
            <span>/</span>
            <Link
              to={`${worldPath}?${product.category ? `categoria=${encodeURIComponent(product.category)}&` : ""}${product.family_id ? `familia=${product.family_id}` : ""}`}
              className="hover:text-foreground transition-colors"
            >
              {product.family}
            </Link>
          </>
        )}
      </nav>

      {/* Produto */}
      <section className="container mx-auto px-4 pb-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">

        {/* Imagens */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl bg-muted/30 border border-border overflow-hidden group cursor-zoom-in"
            onClick={() => setLightbox(true)}>
            {currentImage
              ? <img src={currentImage} alt={product.name} className="w-full h-full object-contain p-4" />
              : <div className="w-full h-full flex items-center justify-center text-muted-foreground/40"><Package2 className="h-20 w-20" /></div>
            }
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg p-1.5">
              <ZoomIn className="h-4 w-4 text-white" />
            </div>
            {allImages.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + allImages.length) % allImages.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % allImages.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${i === imgIdx ? "border-primary" : "border-border opacity-60 hover:opacity-100"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          {/* Badges (clicáveis) */}
          <div className="flex flex-wrap gap-2">
            {product.category && (
              <Link to={`${worldPath}?categoria=${encodeURIComponent(product.category)}`}>
                <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors" title={`Ver tudo em ${product.category}`}>
                  {product.category}
                </Badge>
              </Link>
            )}
            {product.family && product.family_id && (
              <Link to={`${worldPath}?${product.category ? `categoria=${encodeURIComponent(product.category)}&` : ""}familia=${product.family_id}`}>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors" title={`Ver tudo em ${product.family}`}>
                  {product.family}
                </Badge>
              </Link>
            )}
            {product.type && product.type_id && product.family_id && (
              <Link to={`${worldPath}?${product.category ? `categoria=${encodeURIComponent(product.category)}&` : ""}familia=${product.family_id}&tipo=${product.type_id}`}>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors" title={`Ver tudo em ${product.type}`}>
                  {product.type}
                </Badge>
              </Link>
            )}
            {product.brand && (
              <Link to={`${worldPath}?marca=${product.brand_id ?? encodeURIComponent(product.brand)}`}>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors" title={`Ver tudo da marca ${product.brand}`}>
                  {product.brand}
                </Badge>
              </Link>
            )}
            {product.featured && <Badge className="bg-primary text-primary-foreground text-xs gap-1"><Star className="h-3 w-3 fill-current" /> Destaque</Badge>}
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-tight">{product.name}</h1>

          {product.sku && (
            <p className="text-xs text-muted-foreground font-mono">REF: {product.sku}{product.ean ? ` · EAN: ${product.ean}` : ""}</p>
          )}

          {/* Preço */}
          {priceWithVat != null ? (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-1">
              <p className="font-heading text-3xl font-bold text-foreground">
                {priceWithVat.toFixed(2).replace(".", ",")} €
                <span className="ml-2 text-sm font-normal text-muted-foreground">c/ IVA</span>
              </p>
              <p className="text-xs text-muted-foreground">{product.price?.toFixed(2).replace(".", ",")} € s/ IVA</p>
              <p className="text-[10px] text-muted-foreground italic">Preço indicativo — confirmado no orçamento</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-sm text-muted-foreground italic">Preço sob consulta — solicite orçamento</p>
            </div>
          )}

          {/* Stock */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${stockCfg.color}`}>
              <span className={`h-2 w-2 rounded-full ${stockCfg.dot}`} />
              {stockCfg.label}
            </div>
            {envio_especial && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs font-medium">
                <Truck className="h-3.5 w-3.5" /> Envio especial
              </div>
            )}
            {(product.stock_status === "out" || product.stock_status === "on_request") && (
              <StockAlertButton productId={product.id} productName={product.name} />
            )}
          </div>


          {/* Entrega */}
          <div className={`rounded-xl border p-3 space-y-1.5 ${envio_especial ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30"}`}>
            {envio_especial ? (
              <div className="flex items-start gap-2 text-sm text-amber-700">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Este produto tem condições especiais de envio. O custo e prazo de entrega serão indicados no orçamento.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5 text-primary" />
                  <span>Portes calculados no orçamento final</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Prazo de entrega confirmado no orçamento</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  <span>Stock sujeito a disponibilidade</span>
                </div>
              </>
            )}
          </div>

          {/* Teclado nota */}
          {teclado_nota && (
            <div className="rounded-xl border-2 border-amber-400/60 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-1.5">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                ⌨️ Informação sobre o teclado
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                {teclado_nota.includes("/escritorio") ? (
                  <>
                    {teclado_nota.split("— ver em")[0]}—{" "}
                    <a href="/escritorio?categoria=acessorios&familia=acessorios-portateis"
                      className="underline font-semibold hover:text-amber-900 transition-colors">
                      ver acessórios de teclado
                    </a>
                  </>
                ) : teclado_nota}
              </p>
            </div>
          )}

          {/* Destaques */}
          {destaques.filter(d => d !== teclado_nota).length > 0 && (
            <ul className="space-y-1.5">
              {destaques.filter(d => d !== teclado_nota).map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}

          {/* CTA */}
          <div className="grid grid-cols-1 gap-2 pt-2">
            <QuantitySelector
              minQty={minSaleQty}
              onAdd={(qty) => {
                addItem({
                  id: product.id, name: product.name, price: product.price,
                  imageUrl: currentImage, category: product.category,
                  weight: product.weight ?? null,
                  fornecedor: product.fornecedor ?? null,
                  envio_especial: envio_especial,
                  minSaleQty,
                }, qty);
                toast.success(
                  qty > 1
                    ? `${qty}× ${product.name} adicionado ao orçamento`
                    : `${product.name} adicionado ao orçamento`
                );
                setIsOpen(true);
              }}
              label={`Adicionar ao Orçamento${minSaleQty > 1 ? ` (mín. ${minSaleQty} un.)` : ""}`}
            />
            {/* Por encomenda — CTA discreto */}
            {(product.stock_status === "out" || product.stock_status === "on_request") && (
              <a
                href={`mailto:info@vrcf.pt?subject=Consulta%20sobre%20produto%20por%20encomenda&body=Olá,%0A%0AGostaria%20de%20saber%20mais%20sobre%20o%20produto%20por%20encomenda:%0A%0A${encodeURIComponent(product.name)}%0AREF:%20${encodeURIComponent(product.sku ?? product.id)}%0A%0AObrigado`}
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-sm font-medium text-blue-700 dark:text-blue-400"
              >
                <MessageCircle className="h-4 w-4" /> Por encomenda — saber mais, consulte-nos
              </a>
            )}
            <div className="grid grid-cols-2 gap-2">

              <a href={`https://wa.me/351911564243?text=${waText}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium">
                <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
              </a>
              <Button variant="outline" className="gap-2 h-10 rounded-xl" onClick={async () => {
                try { await navigator.clipboard.writeText(window.location.href); toast.success("Link copiado!"); }
                catch { toast.error("Não foi possível copiar"); }
              }}>
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Descrição + Specs */}
      <section className="container mx-auto px-4 pb-12 space-y-8 max-w-4xl">
        {product.description && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-bold mb-3">Descrição</h2>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</div>
          </div>
        )}

        {specsToShow.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-bold mb-4">Especificações técnicas</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0 text-sm">
              {specsToShow.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2 border-b border-border/40">
                  <dt className="text-muted-foreground shrink-0">{SPEC_LABELS[k] ?? k.replace(/_/g, " ")}</dt>
                  <dd className="font-medium text-right text-foreground flex items-center gap-1.5">
                    {k === "teclado" && String(v) === "PT" && <span>🇵🇹</span>}
                    {k === "teclado" ? (TECLADO_DISPLAY[String(v)] ?? String(v)) : String(v)}
                  </dd>
                </div>
              ))}
              {specsExtra.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2 border-b border-border/40">
                  <dt className="text-muted-foreground shrink-0 capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="font-medium text-right text-foreground">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      {/* Lightbox */}
      {lightbox && currentImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <img src={currentImage} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl">&times;</button>
        </div>
      )}

      {/* Produtos relacionados */}
      {related.length > 0 && (
        <section className="container mx-auto px-4 pb-12 max-w-4xl">
          <h2 className="font-heading text-lg font-bold mb-4">
            {(product.stock_status === "out" || product.stock_status === "on_request") ? "Alternativas disponíveis" : "Produtos relacionados"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((r: any) => {
              const rPriceVat = r.price ? r.price * 1.23 : null;
              return (
                <Link key={r.id} to={`/produto/${r.slug ?? r.id}`}
                  className="group rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all overflow-hidden">
                  <div className="aspect-square bg-muted/30 overflow-hidden">
                    {r.image_url
                      ? <img src={r.image_url} alt={r.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center"><Package2 className="h-8 w-8 text-muted-foreground/30" /></div>
                    }
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">{r.name}</p>
                    {r.brand && <p className="text-[10px] text-muted-foreground">{r.brand}</p>}
                    <div className="flex items-center justify-between pt-0.5">
                      {rPriceVat
                        ? <span className="text-xs font-bold">{rPriceVat.toFixed(2).replace(".", ",")} €</span>
                        : <span className="text-[10px] text-muted-foreground italic">Sob consulta</span>
                      }
                      {(r.stock_status === "out" || r.stock_status === "on_request")
                        ? <span className="text-[10px] text-blue-600">Enc.</span>
                        : <span className="text-[10px] text-emerald-600">✓ Stock</span>
                      }
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <SiteFooter />

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="grid grid-cols-3 h-14">
          <Link to="/" className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[9px] font-medium">Início</span>
          </Link>
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

export default Produto;
