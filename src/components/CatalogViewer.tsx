import { useState, useMemo, useRef, useCallback, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ImageOff,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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

// Each page must be a forwardRef component for react-pageflip
const BookPage = forwardRef<HTMLDivElement, { children: React.ReactNode; pageNum: number; totalPages: number; category: string }>(
  ({ children, pageNum, totalPages, category }, ref) => (
    <div ref={ref} className="bg-card h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="bg-primary/5 border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0">
        <span className="font-heading text-sm font-bold text-foreground">{category}</span>
        <span className="text-[10px] text-muted-foreground font-medium">VRCF — Informática & Segurança</span>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        {children}
      </div>
      {/* Page footer */}
      <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <span>Catálogo {category}</span>
        <span>— {pageNum} / {totalPages} —</span>
      </div>
    </div>
  )
);
BookPage.displayName = "BookPage";

export function CatalogViewer({
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
  const bookRef = useRef<any>(null);

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

  // Split products into pages
  const pages = useMemo(() => {
    const result: CatalogProduct[][] = [];
    for (let i = 0; i < filteredProducts.length; i += productsPerPage) {
      result.push(filteredProducts.slice(i, i + productsPerPage));
    }
    if (result.length === 0) result.push([]);
    return result;
  }, [filteredProducts, productsPerPage]);

  const totalPages = pages.length;
  const progressPercent = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar aos Catálogos</span>
          </button>
          <span className="font-heading font-bold text-foreground text-sm sm:text-base">{category}</span>
          <div className="flex items-center gap-2">
            {showSearch ? (
              <div className="flex items-center gap-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(0);
                    if (bookRef.current) bookRef.current.pageFlip().flip(0);
                  }}
                  placeholder="Pesquisar..."
                  className="h-8 w-32 sm:w-48 text-sm"
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSearch(true)}>
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="px-4 pb-2">
          <div className="container mx-auto flex items-center gap-3">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {currentPage + 1} / {totalPages}
            </span>
          </div>
        </div>
      </header>

      {/* Flipbook */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden">
        <div className="w-full max-w-5xl flex flex-col items-center">
          <div className="w-full flex justify-center" style={{ minHeight: 500 }}>
            {/* @ts-ignore - react-pageflip types */}
            <HTMLFlipBook
              ref={bookRef}
              width={500}
              height={620}
              size="stretch"
              minWidth={300}
              maxWidth={600}
              minHeight={400}
              maxHeight={700}
              showCover={false}
              mobileScrollSupport={true}
              onFlip={onFlip}
              className="shadow-2xl rounded-xl overflow-hidden"
              style={{}}
              startPage={0}
              drawShadow={true}
              flippingTime={600}
              usePortrait={true}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.3}
              showPageCorners={true}
              disableFlipByClick={false}
              useMouseEvents={true}
              swipeDistance={30}
              clickEventForward={true}
              renderOnlyPageLengthChange={false}
            >
              {pages.map((pageProducts, pageIndex) => (
                <BookPage key={pageIndex} pageNum={pageIndex + 1} totalPages={totalPages} category={category}>
                  {pageProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Search className="h-10 w-10 mb-3 opacity-40" />
                      <p className="text-sm">Nenhum produto encontrado</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 h-full content-start">
                      {pageProducts.map((product) => {
                        const imgUrl = getProductImage(product);
                        const familyName = product.family_id ? familyMap[product.family_id] || null : null;
                        const descShort = product.description
                          ? product.description.split("\n")[0].replace(/^•\s*/, "").slice(0, 60)
                          : null;

                        return (
                          <div
                            key={product.id}
                            className="group relative rounded-lg border border-border bg-background p-2 flex flex-col"
                          >
                            <div className="aspect-square rounded-md bg-secondary overflow-hidden mb-1.5 relative">
                              {imgUrl ? (
                                <>
                                  <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setZoomedImage(imgUrl); }}
                                    className="absolute top-1 right-1 bg-background/70 backdrop-blur-sm rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <ZoomIn className="h-3 w-3 text-foreground" />
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <ImageOff className="h-6 w-6 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-0.5 flex-1 flex flex-col min-h-0">
                              {familyName && (
                                <span className="inline-block self-start text-[8px] font-medium text-accent-foreground bg-accent/15 px-1 py-0.5 rounded-full leading-none">
                                  {familyName}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProduct({
                                    name: product.name,
                                    description: product.description,
                                    category: product.category,
                                    price: product.price,
                                    imageUrl: product.image_url,
                                    images: imagesByProduct[product.id] || [],
                                    familyName,
                                  });
                                }}
                                className="text-left"
                              >
                                <h4 className="font-heading text-[11px] font-semibold text-card-foreground line-clamp-2 leading-tight hover:text-primary transition-colors">
                                  {product.name}
                                </h4>
                              </button>
                              {descShort && (
                                <p className="text-[9px] text-muted-foreground line-clamp-1 leading-snug">{descShort}</p>
                              )}
                              <div className="mt-auto pt-1 flex items-center justify-between gap-1">
                                {product.price != null ? (
                                  <p className="font-heading font-bold text-xs text-foreground">
                                    {product.price.toFixed(2).replace(".", ",")} €
                                  </p>
                                ) : (
                                  <span className="text-[9px] text-muted-foreground">Consultar</span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleWhatsApp(product); }}
                                  className="flex items-center gap-0.5 text-[9px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 px-1.5 py-0.5 rounded-full transition-colors"
                                >
                                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </BookPage>
              ))}
            </HTMLFlipBook>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-5 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => flipTo(0)} disabled={currentPage === 0} className="h-9 w-9" title="Primeira página">
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => bookRef.current?.pageFlip().flipPrev()} disabled={currentPage === 0} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => {
                const show = totalPages <= 7 || i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1;
                if (!show) {
                  if (i === 1 || i === totalPages - 2) return <span key={i} className="text-muted-foreground self-end px-0.5">…</span>;
                  return null;
                }
                return (
                  <button
                    key={i}
                    onClick={() => flipTo(i)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                      i === currentPage ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-primary/10"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <Button variant="outline" size="sm" onClick={() => bookRef.current?.pageFlip().flipNext()} disabled={currentPage === totalPages - 1} className="gap-1">
              <span className="hidden sm:inline">Seguinte</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => flipTo(totalPages - 1)} disabled={currentPage === totalPages - 1} className="h-9 w-9" title="Última página">
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailDialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)} product={selectedProduct} />
      )}

      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-2 bg-background/95 backdrop-blur-lg">
          <DialogTitle className="sr-only">Zoom da imagem</DialogTitle>
          {zoomedImage && <img src={zoomedImage} alt="Zoom" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
