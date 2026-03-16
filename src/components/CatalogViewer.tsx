import { useState, useMemo } from "react";
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
const WHATSAPP_NUMBER = "351999999999"; // Update with VRCF number

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

export function CatalogViewer({
  category,
  products,
  imagesByProduct,
  familyMap,
  onBack,
  productsPerPage = DEFAULT_PRODUCTS_PER_PAGE,
}: CatalogViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState<"next" | "prev" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Filter products by search
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

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages - 1);
  const pageProducts = filteredProducts.slice(
    safeCurrentPage * productsPerPage,
    (safeCurrentPage + 1) * productsPerPage
  );

  const progressPercent = totalPages > 1 ? ((safeCurrentPage + 1) / totalPages) * 100 : 100;

  const goToPage = (target: number) => {
    if (target < 0 || target >= totalPages || target === safeCurrentPage || flipping) return;
    const direction = target > safeCurrentPage ? "next" : "prev";
    setFlipping(direction);
    setTimeout(() => {
      setCurrentPage(target);
      setFlipping(null);
    }, 400);
  };

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
                  }}
                  placeholder="Pesquisar..."
                  className="h-8 w-32 sm:w-48 text-sm"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                    setCurrentPage(0);
                  }}
                >
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

        {/* Progress bar */}
        <div className="px-4 pb-2">
          <div className="container mx-auto flex items-center gap-3">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {safeCurrentPage + 1} / {totalPages}
            </span>
          </div>
        </div>
      </header>

      {/* Catalog book */}
      <div className="flex-1 flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl">
          <div
            className={`
              relative bg-card rounded-2xl border border-border shadow-xl overflow-hidden
              transition-transform duration-400 ease-in-out
              ${flipping === "next" ? "animate-flip-next" : ""}
              ${flipping === "prev" ? "animate-flip-prev" : ""}
            `}
            style={{ perspective: "1200px" }}
          >
            {/* Page header */}
            <div className="bg-primary/5 border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
              <h2 className="font-heading text-base sm:text-lg font-bold text-foreground">{category}</h2>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                VRCF — Informática & Segurança
              </span>
            </div>

            {/* Products grid */}
            <div className="p-4 sm:p-6 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 min-h-[400px] sm:min-h-[500px]">
              {pageProducts.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              )}
              {pageProducts.map((product) => {
                const imgUrl = getProductImage(product);
                const familyName = product.family_id ? familyMap[product.family_id] || null : null;
                const descriptionShort = product.description
                  ? product.description.split("\n")[0].replace(/^•\s*/, "").slice(0, 80)
                  : null;

                return (
                  <div
                    key={product.id}
                    className="group relative rounded-xl border border-border bg-background p-2.5 sm:p-3 hover:ring-2 hover:ring-primary/20 transition-all flex flex-col"
                  >
                    {/* Image with zoom */}
                    <div className="aspect-square rounded-lg bg-secondary overflow-hidden mb-2 sm:mb-3 relative">
                      {imgUrl ? (
                        <>
                          <img
                            src={imgUrl}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <button
                            onClick={() => setZoomedImage(imgUrl)}
                            className="absolute top-1.5 right-1.5 bg-background/70 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ZoomIn className="h-3.5 w-3.5 text-foreground" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="space-y-1 flex-1 flex flex-col">
                      {familyName && (
                        <span className="inline-block self-start text-[9px] sm:text-[10px] font-medium text-accent-foreground bg-accent/15 px-1.5 py-0.5 rounded-full">
                          {familyName}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setSelectedProduct({
                            name: product.name,
                            description: product.description,
                            category: product.category,
                            price: product.price,
                            imageUrl: product.image_url,
                            images: imagesByProduct[product.id] || [],
                            familyName,
                          })
                        }
                        className="text-left"
                      >
                        <h4 className="font-heading text-xs sm:text-sm font-semibold text-card-foreground line-clamp-2 leading-tight hover:text-primary transition-colors">
                          {product.name}
                        </h4>
                      </button>
                      {descriptionShort && (
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                          {descriptionShort}
                        </p>
                      )}
                      <div className="mt-auto pt-1.5 flex items-center justify-between gap-1">
                        {product.price != null ? (
                          <p className="font-heading font-bold text-sm sm:text-base text-foreground">
                            {product.price.toFixed(2).replace(".", ",")} €
                          </p>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Consultar preço</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsApp(product);
                          }}
                          className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 px-2 py-1 rounded-full transition-colors"
                          title="Contactar via WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Page footer */}
            <div className="border-t border-border px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Catálogo {category}</span>
              <span>— {safeCurrentPage + 1} —</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-5 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(0)}
              disabled={safeCurrentPage === 0 || !!flipping}
              className="h-9 w-9"
              title="Primeira página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 0 || !!flipping}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => {
                // Show limited page numbers on mobile
                const show =
                  totalPages <= 7 ||
                  i === 0 ||
                  i === totalPages - 1 ||
                  Math.abs(i - safeCurrentPage) <= 1;
                if (!show) {
                  if (i === 1 || i === totalPages - 2) return <span key={i} className="text-muted-foreground self-end px-0.5">…</span>;
                  return null;
                }
                return (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    disabled={!!flipping}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                      i === safeCurrentPage
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-primary/10"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages - 1 || !!flipping}
              className="gap-1"
            >
              <span className="hidden sm:inline">Seguinte</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(totalPages - 1)}
              disabled={safeCurrentPage === totalPages - 1 || !!flipping}
              className="h-9 w-9"
              title="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Product detail dialog */}
      {selectedProduct && (
        <ProductDetailDialog
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          product={selectedProduct}
        />
      )}

      {/* Zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-2 bg-background/95 backdrop-blur-lg">
          <DialogTitle className="sr-only">Zoom da imagem</DialogTitle>
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Zoom"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
