import { useState, forwardRef } from "react";
import { ImageOff, Star, Zap } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";
import { QuantitySelector } from "@/components/QuantitySelector";

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  if (error) return (
    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50 w-full h-full justify-center">
      <ImageOff className="h-8 w-8" />
      <span className="text-[10px]">Sem imagem</span>
    </div>
  );
  return (
    <>
      {!loaded && <div className="absolute inset-0 bg-muted animate-pulse rounded-t-xl" />}
      <img src={src} alt={alt}
        className={`w-full h-full object-contain transition-all duration-300 group-hover:scale-[1.04] p-2 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy" decoding="async"
        onLoad={() => setLoaded(true)} onError={() => setError(true)} />
    </>
  );
}

interface ProductCardProps {
  id: string;
  name: string;
  sku?: string | null;
  slug?: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  imageUrl: string | null;
  images: { id: string; image_url: string; position: number }[];
  familyName: string | null;
  brandName?: string | null;
  featured?: boolean;
  stockStatus?: string | null;
  sobEncomenda?: boolean;
  includeInCatalog?: boolean;
  weight?: number | null;
  fornecedor?: string | null;
  envioEspecial?: boolean;
  teclado?: string | null;
  minSaleQty?: number | null;
  onEdit?: () => void;
  isAdmin?: boolean;
  onClick?: () => void;
}

export const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(
  function ProductCard({ id, name, sku, description, category, price, imageUrl, images, familyName, brandName, featured, stockStatus, sobEncomenda, weight, fornecedor, envioEspecial, teclado, minSaleQty, onEdit, isAdmin, onClick }, ref) {
    const { addItem } = useCart();
    const [showSelector, setShowSelector] = useState(false);
    const allImages = images.length > 0
      ? images.sort((a, b) => a.position - b.position).map(i => i.image_url)
      : imageUrl ? [imageUrl] : [];
    const currentImage = allImages[0] || null;

    const step = minSaleQty && minSaleQty > 1 ? minSaleQty : 1;

    const handleAdd = (qty: number) => {
      addItem({
        id, name, price,
        imageUrl: currentImage || imageUrl,
        category,
        weight: weight ?? null,
        fornecedor: fornecedor ?? null,
        envio_especial: envioEspecial ?? false,
        minSaleQty: step,
      }, qty);
      toast.success(qty > 1 ? `${qty}× ${name} adicionado ao orçamento` : `${name} adicionado ao orçamento`);
      trackEvent(id, "quote");
      setShowSelector(false);
    };

    return (
      <div ref={ref}
        className={`group relative flex flex-col bg-card rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30 ${featured && !isAdmin ? "border-primary/40 shadow-primary/10 shadow-sm" : "border-border"}`}
        onClick={() => { if (isAdmin) onEdit?.(); else { trackEvent(id, "click"); onClick?.(); } }}
        onMouseLeave={() => setShowSelector(false)}>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
          {featured && !isAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
              <Star className="h-2.5 w-2.5 fill-current" /> Destaque
            </span>
          )}
          {stockStatus === "low" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide">
              <Zap className="h-2.5 w-2.5" /> Últimas unidades
            </span>
          )}
          {sobEncomenda && (stockStatus === "out" || stockStatus === "on_request") && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
              Sob encomenda
            </span>
          )}
        </div>
        {/* Bandeira PT — teclado português */}
        {teclado === "PT" && (
          <div className="absolute top-2.5 right-2.5 z-10" title="Teclado Português">
            <span className="text-base leading-none">🇵🇹</span>
          </div>
        )}

        {/* Imagem */}
        <div className="relative bg-muted/30 aspect-square overflow-hidden rounded-t-2xl flex items-center justify-center">
          {currentImage ? <ProductImage src={currentImage} alt={name} /> : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground/40">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
          {/* Quick add overlay — seletor de quantidade direto no hover */}
          {!isAdmin && (
            <div
              className={`absolute inset-x-0 bottom-0 transition-transform duration-200 p-2 ${showSelector ? "translate-y-0" : "translate-y-full group-hover:translate-y-0"}`}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setShowSelector(true)}
            >
              <QuantitySelector
                compact
                minQty={step}
                onAdd={handleAdd}
                onCancel={() => setShowSelector(false)}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 p-3 gap-1.5">
          {/* Categoria / Família */}
          <div className="flex items-center gap-1 flex-wrap">
            {category && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/80 truncate">{category}</span>
            )}
            {brandName && (
              <>
                <span className="text-muted-foreground/40 text-[10px]">·</span>
                <span className="text-[10px] text-muted-foreground truncate">{brandName}</span>
              </>
            )}
          </div>

          {/* Nome */}
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{name}</h3>

          {/* SKU */}
          {sku && <p className="text-[10px] text-muted-foreground/60 font-mono">{sku}</p>}

          {/* Preço + indicador de stock */}
          <div className="mt-auto pt-2">
            {price != null ? (
              <div className="flex items-baseline justify-between gap-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-foreground tabular-nums">
                    {(price * 1.23).toFixed(2).replace(".", ",")} €
                  </span>
                  <span className="text-[10px] text-muted-foreground">c/ IVA</span>
                </div>
                {stockStatus && (
                  <span
                    title={
                      stockStatus === "high"       ? "Em stock"
                    : stockStatus === "medium"     ? "Stock médio"
                    : stockStatus === "low"        ? "Últimas unidades"
                    : stockStatus === "on_request" ? "Por encomenda"
                    : "Disponibilidade desconhecida"
                    }
                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 mb-0.5 ${
                      stockStatus === "high"       ? "bg-green-500"
                    : stockStatus === "medium"     ? "bg-amber-400"
                    : stockStatus === "low"        ? "bg-orange-500"
                    : stockStatus === "on_request" ? "bg-blue-500"
                    : "bg-gray-400"
                    }`}
                  />
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Preço sob consulta</span>
            )}
          </div>
        </div>
      </div>
    );
  }
);
