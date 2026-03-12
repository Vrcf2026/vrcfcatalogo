import { useState } from "react";
import { Package, ImageOff, Pencil } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  imageUrl: string | null;
  images: { id: string; image_url: string; position: number }[];
  familyName: string | null;
  onEdit?: () => void;
  isAdmin?: boolean;
}

export function ProductCard({ name, description, category, price, imageUrl, images, familyName, onEdit, isAdmin }: ProductCardProps) {
  const allImages = images.length > 0
    ? images.sort((a, b) => a.position - b.position).map(i => i.image_url)
    : imageUrl ? [imageUrl] : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentImage = allImages[selectedIndex] || null;

  return (
    <div
      className={`group product-card-shadow rounded-xl bg-card overflow-hidden border border-border ${isAdmin ? 'cursor-pointer' : ''}`}
      onClick={isAdmin ? onEdit : undefined}
    >
      <div className="relative aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {currentImage ? (
          <img
            src={currentImage}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="h-10 w-10" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
        {isAdmin && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
              <Pencil className="h-3.5 w-3.5 text-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-1.5 px-3 py-2 bg-secondary/50">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(idx); }}
              className={`w-10 h-10 rounded-md overflow-hidden border-2 transition-all flex-shrink-0 ${
                idx === selectedIndex ? 'border-primary ring-1 ring-primary' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {category && (
            <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {category}
            </span>
          )}
          {familyName && (
            <span className="inline-block text-[11px] font-medium text-accent-foreground bg-accent/15 px-2 py-0.5 rounded-full">
              {familyName}
            </span>
          )}
        </div>
        <h3 className="font-heading font-semibold text-card-foreground line-clamp-1">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        {price != null && (
          <div>
            <p className="font-heading font-bold text-lg text-foreground">
              {price.toFixed(2).replace(".", ",")} €
            </p>
            <p className="text-[10px] text-muted-foreground">IVA incluído à taxa legal em vigor</p>
          </div>
        )}
      </div>
    </div>
  );
}
