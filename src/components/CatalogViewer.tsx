import { useState, useMemo, useRef, useCallback, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const DEFAULT_PRODUCTS_PER_PAGE = 6;
const WHATSAPP_NUMBER = "351999999999";

interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  family_id: string | null;
}

interface CatalogViewerProps {
  category: string;
  products: CatalogProduct[];
  imagesByProduct: Record<string, { id: string; image_url: string; position: number }[]>;
  familyMap: Record<string, string>;
  onBack: () => void;
  productsPerPage?: number;
}

// Flipbook page wrapper - must be forwardRef for react-pageflip
const FlipPage = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <div ref={ref} className="bg-white dark:bg-gray-50 h-full w-full overflow-hidden shadow-lg">
      {children}
    </div>
  )
);
FlipPage.displayName = "FlipPage";
// Category-specific cover designs
const CATEGORY_THEMES: Record<string, { gradient: string; icon: string; pattern: string; accent: string }> = {
  Laptops: {
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)",
    icon: "💻",
    pattern: "radial-gradient(circle at 20% 80%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.1) 0%, transparent 50%)",
    accent: "#3b82f6",
  },
  Smartphones: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    icon: "📱",
    pattern: "radial-gradient(circle at 30% 70%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(99,102,241,0.1) 0%, transparent 50%)",
    accent: "#8b5cf6",
  },
  Gaming: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #2d1b69 100%)",
    icon: "🎮",
    pattern: "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.12) 0%, transparent 50%)",
    accent: "#ec4899",
  },
  Outros: {
    gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)",
    icon: "🔧",
    pattern: "radial-gradient(circle at 25% 75%, rgba(245,158,11,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(251,146,60,0.08) 0%, transparent 50%)",
    accent: "#f59e0b",
  },
};

const DEFAULT_THEME = {
  gradient: "linear-gradient(135deg, hsl(27 90% 20%) 0%, hsl(27 90% 35%) 50%, hsl(27 90% 50%) 100%)",
  icon: "📦",
  pattern: "radial-gradient(circle at 30% 70%, rgba(251,146,60,0.15) 0%, transparent 50%)",
  accent: "hsl(27 90% 50%)",
};

function CoverPage({ category, productCount, coverImage }: { category: string; productCount: number; coverImage: string | null }) {
  const theme = CATEGORY_THEMES[category] || DEFAULT_THEME;

  return (
    <div className="h-full w-full relative overflow-hidden" style={{ background: theme.gradient }}>
      {/* Pattern overlay */}
      <div className="absolute inset-0" style={{ background: theme.pattern }} />

      {/* Geometric decorations */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: `linear-gradient(225deg, ${theme.accent}, transparent)` }} />
      <div className="absolute bottom-0 left-0 w-40 h-40 opacity-10" style={{ background: `linear-gradient(45deg, ${theme.accent}, transparent)` }} />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: theme.accent }} />

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2" style={{ borderColor: `${theme.accent}40` }} />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2" style={{ borderColor: `${theme.accent}40` }} />

      {/* Content */}
      <div className="h-full flex flex-col items-center justify-center relative z-10 px-8">
        {/* VRCF branding */}
        <div className="absolute top-8 left-0 right-0 text-center">
          <p className="text-white/30 text-[9px] font-bold tracking-[0.5em] uppercase">VRCF</p>
          <p className="text-white/20 text-[7px] tracking-[0.3em] uppercase mt-0.5">Informática & Segurança</p>
        </div>

        {/* Category icon */}
        <div className="text-5xl mb-4 drop-shadow-lg">{theme.icon}</div>

        {/* Cover image */}
        {coverImage && (
          <div className="w-28 h-28 rounded-2xl overflow-hidden mb-5 shadow-2xl ring-2 ring-white/10">
            <img src={coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Category title */}
        <div className="text-center space-y-3">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-8 h-px" style={{ backgroundColor: `${theme.accent}60` }} />
            <p className="text-white/50 text-[10px] font-semibold tracking-[0.4em] uppercase">Catálogo</p>
            <div className="w-8 h-px" style={{ backgroundColor: `${theme.accent}60` }} />
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-none tracking-tight">
            {category}
          </h1>

          <div className="w-16 h-1 rounded-full mx-auto" style={{ backgroundColor: theme.accent }} />

          <p className="text-white/40 text-xs font-medium">
            {productCount} {productCount === 1 ? "produto" : "produtos"}
          </p>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-8 flex flex-col items-center gap-1">
          <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-white/40 animate-bounce" />
          </div>
          <p className="text-white/25 text-[9px] tracking-wider">Arraste para folhear</p>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: `${theme.accent}40` }} />
    </div>
  );
}


  category,
  products,
  imagesByProduct,
  familyMap,
  onBack,
  productsPerPage = DEFAULT_PRODUCTS_PER_PAGE,
}: CatalogViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoom, setZoom] = useState(100);
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.family_id && familyMap[p.family_id]?.toLowerCase().includes(q))
    );
  }, [products, searchQuery, familyMap]);

  const pages = useMemo(() => {
    const result: CatalogProduct[][] = [];
    for (let i = 0; i < filteredProducts.length; i += productsPerPage) {
      result.push(filteredProducts.slice(i, i + productsPerPage));
    }
    if (result.length === 0) result.push([]);
    return result;
  }, [filteredProducts, productsPerPage]);

  // +1 for cover page
  const totalPages = pages.length + 1;

  const getProductImage = (product: CatalogProduct) => {
    const imgs = imagesByProduct[product.id];
    if (imgs && imgs.length > 0) return imgs.sort((a, b) => a.position - b.position)[0].image_url;
    return product.image_url;
  };

  const handleWhatsApp = (product: CatalogProduct) => {
    const msg = encodeURIComponent(
      `Olá! Gostaria de saber mais sobre o produto: ${product.name}${product.price != null ? ` (${product.price.toFixed(2).replace(".", ",")} €)` : ""}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

  const flipTo = (page: number) => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flip(page);
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement && containerRef.current) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Cover image - first product with image
  const coverProduct = products.find((p) => {
    const imgs = imagesByProduct[p.id];
    return (imgs && imgs.length > 0) || p.image_url;
  });
  const coverImage = coverProduct ? getProductImage(coverProduct) : null;

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#2a2a2a" }}
    >
      {/* Top bar - minimal */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 bg-black/30 backdrop-blur-sm z-50">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
          <span className="font-heading font-bold text-white/90 text-sm">{category}</span>
          <div className="w-16" />
        </div>
      )}

      {/* Flipbook area */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
      >
        {/* Thumbnails panel */}
        {showThumbnails && (
          <div className="absolute left-0 top-0 bottom-0 w-48 bg-black/80 backdrop-blur-md z-40 overflow-y-auto p-3 space-y-2">
            {/* Cover thumbnail */}
            <button
              onClick={() => { flipTo(0); setShowThumbnails(false); }}
              className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === 0 ? "border-primary" : "border-transparent hover:border-white/30"}`}
            >
              <div className="aspect-[3/4] bg-white flex items-center justify-center p-2">
                <span className="font-heading text-[8px] font-bold text-gray-800 text-center">{category}</span>
              </div>
              <div className="bg-black/60 text-white text-[10px] text-center py-0.5">Capa</div>
            </button>
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => { flipTo(i + 1); setShowThumbnails(false); }}
                className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === i + 1 ? "border-primary" : "border-transparent hover:border-white/30"}`}
              >
                <div className="aspect-[3/4] bg-white flex items-center justify-center p-1">
                  <span className="text-[8px] text-gray-500">{productsPerPage} produtos</span>
                </div>
                <div className="bg-black/60 text-white text-[10px] text-center py-0.5">{i + 1}</div>
              </button>
            ))}
          </div>
        )}

        {/* @ts-ignore */}
        <HTMLFlipBook
          ref={bookRef}
          width={480}
          height={640}
          size="stretch"
          minWidth={280}
          maxWidth={560}
          minHeight={380}
          maxHeight={750}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onFlip}
          className=""
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.4}
          showPageCorners={true}
          disableFlipByClick={false}
          useMouseEvents={true}
          swipeDistance={30}
          clickEventForward={true}
          renderOnlyPageLengthChange={false}
        >
          {/* Cover page */}
          <FlipPage>
            <CoverPage
              category={category}
              productCount={filteredProducts.length}
              coverImage={coverImage}
            />
          </FlipPage>

          {/* Product pages */}
          {pages.map((pageProducts, pageIndex) => (
            <FlipPage key={pageIndex}>
              <div className="h-full flex flex-col p-4 sm:p-5">
                {/* Page header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "#e5e5e5" }}>
                  <span className="font-heading text-xs font-bold" style={{ color: "#1a1a1a" }}>{category}</span>
                  <span className="text-[10px] font-medium" style={{ color: "hsl(27 90% 50%)" }}>
                    VRCF
                  </span>
                </div>

                {/* Products grid */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2.5 content-start">
                  {pageProducts.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center h-full" style={{ color: "#999" }}>
                      <Search className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-xs">Nenhum produto encontrado</p>
                    </div>
                  ) : (
                    pageProducts.map((product) => {
                      const imgUrl = getProductImage(product);
                      const familyName = product.family_id ? familyMap[product.family_id] || null : null;
                      const descShort = product.description
                        ? product.description.split("\n")[0].replace(/^•\s*/, "").slice(0, 50)
                        : null;

                      return (
                        <div key={product.id} className="group flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid #eee" }}>
                          {/* Image */}
                          <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: "#f5f5f5" }}>
                            {imgUrl ? (
                              <>
                                <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); setZoomedImage(imgUrl); }}
                                  className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ backgroundColor: "rgba(255,255,255,0.8)" }}
                                >
                                  <ZoomIn className="h-3 w-3" style={{ color: "#333" }} />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageOff className="h-5 w-5" style={{ color: "#ccc" }} />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-1.5 flex flex-col gap-0.5 flex-1">
                            {familyName && (
                              <span className="text-[7px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded self-start"
                                style={{ color: "hsl(27 90% 45%)", backgroundColor: "hsl(27 90% 95%)" }}>
                                {familyName}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct({
                                  name: product.name, description: product.description,
                                  category: product.category, price: product.price,
                                  imageUrl: product.image_url, images: imagesByProduct[product.id] || [],
                                  familyName,
                                });
                              }}
                              className="text-left"
                            >
                              <h4 className="font-heading text-[10px] font-bold leading-tight line-clamp-2"
                                style={{ color: "#1a1a1a" }}>
                                {product.name}
                              </h4>
                            </button>
                            {descShort && (
                              <p className="text-[8px] line-clamp-1 leading-snug" style={{ color: "#888" }}>{descShort}</p>
                            )}
                            <div className="mt-auto pt-1 flex items-center justify-between">
                              {product.price != null ? (
                                <span className="font-heading font-bold text-[11px]" style={{ color: "#1a1a1a" }}>
                                  {product.price.toFixed(2).replace(".", ",")} €
                                </span>
                              ) : (
                                <span className="text-[8px]" style={{ color: "#aaa" }}>Consultar</span>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleWhatsApp(product); }}
                                className="rounded-full p-1 transition-colors"
                                style={{ backgroundColor: "#e8f5e9" }}
                                title="WhatsApp"
                              >
                                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" style={{ fill: "#25D366" }} xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Page footer */}
                <div className="mt-2 pt-2 flex items-center justify-between text-[9px]" style={{ borderTop: "1px solid #eee", color: "#bbb" }}>
                  <span>Catálogo {category}</span>
                  <span>{pageIndex + 1} / {pages.length}</span>
                </div>
              </div>
            </FlipPage>
          ))}
        </HTMLFlipBook>

        {/* Side navigation arrows */}
        <button
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity z-30"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => bookRef.current?.pageFlip().flipNext()}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity z-30"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          disabled={currentPage === totalPages - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom toolbar - Flipsnack style */}
      <div className="flex items-center justify-between px-3 py-2 z-50" style={{ backgroundColor: "#1a1a1a" }}>
        {/* Left: page counter */}
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-xs font-medium">
            {currentPage + 1} / {totalPages}
          </span>
          {/* Progress bar */}
          <div className="hidden sm:block w-32 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((currentPage + 1) / totalPages) * 100}%`,
                backgroundColor: "hsl(27 90% 50%)",
              }}
            />
          </div>
        </div>

        {/* Center: controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white/50 text-[10px] w-8 text-center">{zoom}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setZoom(Math.min(150, zoom + 10))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => setShowThumbnails(!showThumbnails)}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>

          {showSearch ? (
            <div className="flex items-center gap-1 ml-1">
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); if (bookRef.current) bookRef.current.pageFlip().flip(0); }}
                placeholder="Pesquisar..."
                className="h-7 w-28 sm:w-36 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          <div className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>

        {/* Right: back */}
        {isFullscreen && (
          <button onClick={toggleFullscreen} className="text-white/60 hover:text-white text-xs">
            Sair
          </button>
        )}
        {!isFullscreen && <div className="w-16" />}
      </div>

      {/* Product detail */}
      {selectedProduct && (
        <ProductDetailDialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)} product={selectedProduct} />
      )}

      {/* Zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-2 bg-background/95 backdrop-blur-lg">
          <DialogTitle className="sr-only">Zoom da imagem</DialogTitle>
          {zoomedImage && <img src={zoomedImage} alt="Zoom" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
