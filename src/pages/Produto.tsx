import { useQuery } from "@tanstack/react-query";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import {
  Loader2, ArrowLeft, ShoppingCart, ShieldCheck, Package2,
  MessageCircle, Copy, Truck, Clock, Info, ChevronLeft, ChevronRight,
  ZoomIn, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { toast } from "sonner";
import vrcfLogo from "@/assets/vrcf-logo.png";

const STOCK_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  high:       { label: "Em stock",           color: "bg-emerald-500/12 text-emerald-700 border-emerald-500/30", dot: "bg-emerald-500" },
  low:        { label: "Últimas unidades",   color: "bg-amber-500/12 text-amber-700 border-amber-500/30",    dot: "bg-amber-500" },
  out:        { label: "Sob encomenda",       color: "bg-blue-500/12 text-blue-700 border-blue-500/30",       dot: "bg-blue-500" },
};

// Tradução de chaves de specs para português legível
const SPEC_LABELS: Record<string, string> = {
  tipo: "Tipo", resolucao: "Resolução", resolucao_maxima: "Resolução máxima",
  iluminacao: "Iluminação", alcance_ir: "Alcance IR", angulo_visao: "Ângulo de visão",
  sensor: "Sensor", fps: "Taxa de imagem", compressao: "Compressão",
  lente: "Lente", protecao_ip: "Protecção IP", protecao_ik: "Protecção IK",
  poe: "PoE", wifi: "Wi-Fi", bluetooth: "Bluetooth", audio: "Áudio",
  armazenamento_interno: "Armazenamento interno", armazenamento: "Armazenamento",
  comunicacao: "Comunicação", alimentacao: "Alimentação", temperatura: "Temp. funcionamento",
  humidade: "Humidade", grau_protecao: "Grau de protecção", grau_seguranca: "Grau de segurança",
  dimensoes: "Dimensões", peso: "Peso", cor: "Cor", canais: "Canais",
  tecnologia: "Tecnologia", bateria: "Bateria", ia: "Inteligência Artificial",
  wdr: "WDR / HDR", protocolo: "Protocolo", interface_rede: "Interface de rede",
  encriptacao: "Encriptação", firmware_ota: "Firmware OTA", frequencia: "Frequência",
  distancia_transmissao: "Distância de transmissão", compatibilidade: "Compatibilidade",
  funcoes_inteligentes: "Funções inteligentes", acesso_remoto: "Acesso remoto",
  alarme: "Alarme", sensibilidade: "Sensibilidade", gama: "Gama",
  processador: "Processador", geracao: "Geração", grafica: "Placa Gráfica",
  ram_gb: "RAM (GB)", ram_tipo: "Tipo de RAM", ram_slots: "Slots RAM",
  ram_ampliavel: "RAM Ampliável", armazenamento_gb: "Armazenamento (GB)",
  armazenamento_tipo: "Tipo de armazenamento", ecra_polegadas: "Ecrã (\")",
  sistema_operativo: "Sistema Operativo", grau: "Grau", teclado: "Teclado",
  leitor_gravador: "Leitor/Gravador", webcam: "Webcam",
  portas: "Portas", instalacao: "Instalação",
};

const Produto = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, setIsOpen } = useCart();
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-slug", slug],
    queryFn: async () => {
      const { data: bySlug } = await supabase.from("products").select("*").eq("slug", slug!).maybeSingle();
      if (bySlug) return bySlug;
      const { data: byId } = await supabase.from("products").select("*").eq("id", slug!).maybeSingle();
      return byId;
    },
    enabled: !!slug,
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!product) return <Navigate to="/404" replace />;

  // Imagens — db images + imagens_extra do produto
  const extraImgs = Array.isArray(product.imagens_extra) ? product.imagens_extra : [];
  const allImages = dbImages.length > 0
    ? dbImages.sort((a: any, b: any) => a.position - b.position).map((i: any) => i.image_url)
    : product.image_url
      ? [product.image_url, ...extraImgs]
      : extraImgs;
  const currentImage = allImages[imgIdx] || null;

  const specs = (typeof product.especificacoes === "string"
    ? JSON.parse(product.especificacoes || "{}")
    : product.especificacoes ?? {}) as Record<string, string>;

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
  const teclado_nota = ["Portátil", "Tudo-em-Um"].includes(specs.tipo ?? "") ? specs.teclado_nota : undefined;
  const envio_especial = !!product.envio_especial;
  const stockCfg = STOCK_CONFIG[product.stock_status ?? "out"] ?? STOCK_CONFIG.out;
  const worldPath = product.mundo === "escritorio" ? "/escritorio" : "/seguranca";
  const worldLabel = product.mundo === "escritorio" ? "Escritório & IT" : "Segurança & Redes";
  const priceWithVat = product.price ? product.price * 1.23 : null;
  const waText = encodeURIComponent(`Olá VRCF, quero informação sobre: ${product.name}${product.sku ? ` (Ref: ${product.sku})` : ""}`);

  const handleAddToCart = () => {
    addItem({ id: product.id, name: product.name, price: product.price, imageUrl: currentImage, category: product.category }, 1);
    toast.success(`${product.name} adicionado ao orçamento`);
    setIsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{product.name} — VRCF Showroom</title>
        <meta name="description" content={product.short_description ?? product.description?.slice(0, 160) ?? product.name} />
        <link rel="canonical" href={`https://showroom.vrcf.info/produto/${product.slug ?? product.id}`} />
        {currentImage && <meta property="og:image" content={currentImage} />}
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4">
          <div className="flex items-center gap-3">
            <Link to={worldPath} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <Link to="/"><img src={vrcfLogo} alt="VRCF" className="h-9 sm:h-11 w-auto" /></Link>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-1.5 h-9 relative">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Orçamento</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 py-3 text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
        <Link to="/" className="hover:text-foreground">Início</Link>
        <span>/</span>
        <Link to={worldPath} className="hover:text-foreground">{worldLabel}</Link>
        {product.category && <><span>/</span><span>{product.category}</span></>}
      </nav>

      {/* Produto */}
      <section className="container mx-auto px-4 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

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
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {product.category && <Badge variant="secondary" className="text-xs">{product.category}</Badge>}
            {product.brand && <Badge variant="outline" className="text-xs">{product.brand}</Badge>}
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
                  <span>Entrega em <strong className="text-foreground">48h a 72h úteis</strong> após confirmação de pagamento</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  <span>Stock referente ao armazém online — pode diferir do stock em loja física</span>
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
            <Button size="lg" className="gap-2 h-12 text-base font-bold rounded-xl" onClick={handleAddToCart}>
              <ShoppingCart className="h-5 w-5" /> Adicionar ao Orçamento
            </Button>
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

      <CartDrawer />
      <ContactFloatingBubble />
    </div>
  );
};

export default Produto;
