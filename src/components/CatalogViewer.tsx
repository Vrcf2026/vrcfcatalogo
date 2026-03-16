import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";

const PRODUCTS_PER_PAGE = 6;

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
}

export function CatalogViewer({ category, products, imagesByProduct, familyMap, onBack }: CatalogViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState<"next" | "prev" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const pageProducts = products.slice(
    currentPage * PRODUCTS_PER_PAGE,
    (currentPage + 1) * PRODUCTS_PER_PAGE
  );

  const goToPage = (direction: "next" | "prev") => {
    const target = direction === "next" ? currentPage + 1 : currentPage - 1;
    if (target < 0 || target >= totalPages) return;
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar aos Catálogos
          </button>
          <span className="font-heading font-bold text-foreground">{category}</span>
          <span className="text-sm text-muted-foreground">
            Página {currentPage + 1} de {totalPages}
          </span>
        </div>
      </header>

      {/* Catalog book */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl">
          {/* Book container */}
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
            <div className="bg-primary/5 border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-foreground">{category}</h2>
              <span className="text-xs text-muted-foreground font-medium">
                VRCF — Informática & Segurança
              </span>
            </div>

            {/* Products grid */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 min-h-[500px]">
              {pageProducts.map((product) => {
                const imgUrl = getProductImage(product);
                const familyName = product.family_id ? familyMap[product.family_id] || null : null;

                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct({
                      name: product.name,
                      description: product.description,
                      category: product.category,
                      price: product.price,
                      imageUrl: product.image_url,
                      images: imagesByProduct[product.id] || [],
                      familyName,
                    })}
                    className="group text-left rounded-xl border border-border bg-background p-3 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                  >
                    <div className="aspect-square rounded-lg bg-secondary overflow-hidden mb-3">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      {familyName && (
                        <span className="inline-block text-[10px] font-medium text-accent-foreground bg-accent/15 px-1.5 py-0.5 rounded-full">
                          {familyName}
                        </span>
                      )}
                      <h4 className="font-heading text-sm font-semibold text-card-foreground line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                      {product.price != null && (
                        <p className="font-heading font-bold text-base text-foreground">
                          {product.price.toFixed(2).replace(".", ",")} €
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Page footer */}
            <div className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Catálogo {category}</span>
              <span>— {currentPage + 1} —</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => goToPage("prev")}
              disabled={currentPage === 0 || !!flipping}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i !== currentPage && !flipping) {
                      setFlipping(i > currentPage ? "next" : "prev");
                      setTimeout(() => {
                        setCurrentPage(i);
                        setFlipping(null);
                      }, 400);
                    }
                  }}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    i === currentPage
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-primary/10"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => goToPage("next")}
              disabled={currentPage === totalPages - 1 || !!flipping}
              className="gap-2"
            >
              Seguinte
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailDialog
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          product={selectedProduct}
        />
      )}
    </div>
  );
}
