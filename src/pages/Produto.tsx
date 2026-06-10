import { useQuery } from "@tanstack/react-query";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Loader2, ArrowLeft, ShoppingCart, Minus, Plus, ShieldCheck, Package2, MessageCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { toast } from "sonner";
import vrcfLogo from "@/assets/vrcf-logo.png";

const stockLabels: Record<string, { label: string; className: string }> = {
  high: { label: "Em stock", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  medium: { label: "Stock limitado", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  low: { label: "Últimas unidades", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  on_request: { label: "Sob encomenda", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  unknown: { label: "Consultar disponibilidade", className: "bg-muted text-muted-foreground border-border" },
};

const Produto = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, setIsOpen } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product-slug", slug],
    queryFn: async () => {
      // Try slug first, then fallback to id
      const { data: bySlug } = await supabase.from("products").select("*").eq("slug", slug!).maybeSingle();
      if (bySlug) return bySlug;
      const { data: byId } = await supabase.from("products").select("*").eq("id", slug!).maybeSingle();
      return byId;
    },
    enabled: !!slug,
  });

  const { data: images = [] } = useQuery({
    queryKey: ["product-images", product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("product_images").select("*").eq("product_id", product!.id).order("position");
      return data ?? [];
    },
    enabled: !!product?.id,
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!product) return <Navigate to="/404" replace />;

  const allImages = images.length > 0
    ? images.sort((a, b) => a.position - b.position).map((i) => i.image_url)
    : product.image_url ? [product.image_url] : [];
  const currentImage = allImages[imgIdx];

  const stock = stockLabels[product.stock_status ?? "unknown"] ?? stockLabels.unknown;
  const specs = (product.especificacoes ?? {}) as Record<string, string>;
  const destaques = (product.destaques ?? []) as string[];
  const worldPath = product.mundo === "escritorio" ? "/escritorio" : "/seguranca";
  const worldLabel = product.mundo === "escritorio" ? "Escritório & IT" : "Segurança & Redes";
  const productUrl = `https://showroom.vrcf.info/produto/${product.slug ?? product.id}`;
  const waText = encodeURIComponent(`Olá VRCF, quero informação sobre: ${product.name}${product.sku ? ` (Ref: ${product.sku})` : ""}`);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: "https://showroom.vrcf.info/" },
      { "@type": "ListItem", position: 2, name: worldLabel, item: `https://showroom.vrcf.info${worldPath}` },
      ...(product.category ? [{ "@type": "ListItem", position: 3, name: product.category, item: productUrl }] : []),
      { "@type": "ListItem", position: product.category ? 4 : 3, name: product.name, item: productUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{product.name} — VRCF Showroom</title>
        <meta name="description" content={product.short_description ?? product.description?.slice(0, 160) ?? product.name} />
        <link rel="canonical" href={`https://showroom.vrcf.info/produto/${product.slug ?? product.id}`} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.short_description ?? ""} />
        {currentImage && <meta property="og:image" content={currentImage} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.short_description ?? product.description,
          image: currentImage,
          sku: product.sku ?? undefined,
          category: product.category ?? undefined,
          offers: product.price ? {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "EUR",
            availability: product.stock_status === "high" ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
          } : undefined,
        })}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-3">
            <Link to={worldPath} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <Link to="/"><img src={vrcfLogo} alt="VRCF" className="h-10 sm:h-12 w-auto" /></Link>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-1.5 h-9">
              <ShoppingCart className="h-4 w-4" /> Orçamento
            </Button>
          </div>
        </div>
      </header>

      <nav className="container mx-auto px-4 pt-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Início</Link>
        <span className="mx-1.5">/</span>
        <Link to={worldPath} className="hover:text-foreground">{worldLabel}</Link>
        {product.category && (<><span className="mx-1.5">/</span><span>{product.category}</span></>)}
      </nav>

      <section className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl bg-secondary overflow-hidden border border-border">
            {currentImage ? (
              <img src={currentImage} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package2 className="h-16 w-16" /></div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`aspect-square rounded-lg overflow-hidden border-2 ${i === imgIdx ? "border-primary" : "border-border opacity-60 hover:opacity-100"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {product.category && <Badge variant="secondary">{product.category}</Badge>}
            {product.family && <Badge variant="outline">{product.family}</Badge>}
            {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            <Badge variant="outline" className={stock.className}>{stock.label}</Badge>
            {product.featured && <Badge className="bg-primary text-primary-foreground">★ Destaque</Badge>}
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">{product.name}</h1>
          {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
          {product.short_description && <p className="text-lg text-muted-foreground">{product.short_description}</p>}

          {product.price != null && (
            <p className="font-heading text-3xl font-bold text-foreground">
              {Number(product.price).toFixed(2).replace(".", ",")} €
              <span className="ml-2 text-xs font-normal text-muted-foreground">IVA incl.</span>
            </p>
          )}

          {destaques.length > 0 && (
            <ul className="space-y-1.5 text-sm">
              {destaques.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center border border-border rounded-md">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-r-none" onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus className="h-3.5 w-3.5" /></Button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-l-none" onClick={() => setQuantity((q) => q + 1)}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="lg" className="gap-2 flex-1" onClick={() => {
              addItem({ id: product.id, name: product.name, price: product.price, imageUrl: currentImage, category: product.category }, quantity);
              toast.success(`${quantity}x ${product.name} adicionado ao orçamento`);
              setQuantity(1);
            }}>
              <ShoppingCart className="h-4 w-4" /> Adicionar ao Orçamento
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/351911564243?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              WhatsApp
            </a>
            <Button variant="outline" className="gap-2 h-10" onClick={copyLink}>
              <Copy className="h-4 w-4" /> Copiar link
            </Button>
          </div>

          {product.description && (
            <div className="pt-6 border-t border-border">
              <h2 className="font-heading text-lg font-bold mb-2">Descrição</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{product.description}</p>
            </div>
          )}

          {Object.keys(specs).length > 0 && (
            <div className="pt-4 border-t border-border">
              <h2 className="font-heading text-lg font-bold mb-3">Especificações</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-1 border-b border-border/50">
                    <dt className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                    <dd className="font-medium text-right">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.conteudo_embalagem && (
            <div className="pt-4 border-t border-border">
              <h2 className="font-heading text-lg font-bold mb-2">Conteúdo da embalagem</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{product.conteudo_embalagem}</p>
            </div>
          )}
        </div>
      </section>

      <CartDrawer />
      <ContactFloatingBubble />
    </div>
  );
};

export default Produto;
