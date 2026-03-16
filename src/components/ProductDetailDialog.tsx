import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ImageOff, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    name: string;
    description: string | null;
    category: string | null;
    price: number | null;
    imageUrl: string | null;
    images: { id: string; image_url: string; position: number }[];
    familyName: string | null;
  };
}

export function ProductDetailDialog({ open, onOpenChange, product }: ProductDetailDialogProps) {
  const allImages = product.images.length > 0
    ? product.images.sort((a, b) => a.position - b.position).map(i => i.image_url)
    : product.imageUrl ? [product.imageUrl] : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentImage = allImages[selectedIndex] || null;

  const goNext = () => setSelectedIndex((i) => (i + 1) % allImages.length);
  const goPrev = () => setSelectedIndex((i) => (i - 1 + allImages.length) % allImages.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        <div className="flex flex-col md:flex-row">
          {/* Image section */}
          <div className="relative w-full md:w-1/2 aspect-square bg-secondary flex items-center justify-center">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageOff className="h-12 w-12" />
                <span className="text-sm">Sem imagem</span>
              </div>
            )}

            {allImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm hover:bg-background/90 rounded-full h-8 w-8"
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm hover:bg-background/90 rounded-full h-8 w-8"
                  onClick={goNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-background/70 backdrop-blur-sm rounded-full px-2 py-1">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === selectedIndex ? 'bg-primary scale-125' : 'bg-muted-foreground/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info section */}
          <div className="w-full md:w-1/2 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {product.category && (
                <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {product.category}
                </span>
              )}
              {product.familyName && (
                <span className="inline-block text-[11px] font-medium text-accent-foreground bg-accent/15 px-2.5 py-1 rounded-full">
                  {product.familyName}
                </span>
              )}
            </div>

            <h2 className="font-heading text-2xl font-bold text-foreground">{product.name}</h2>

            {product.price != null && (
              <p className="font-heading text-3xl font-bold text-primary">
                {product.price.toFixed(2).replace(".", ",")} €
              </p>
            )}

            {product.description && (
              <div className="flex-1 overflow-y-auto">
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}