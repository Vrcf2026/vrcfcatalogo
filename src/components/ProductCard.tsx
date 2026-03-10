import { Package, ImageOff, Pencil } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  imageUrl: string | null;
  familyName: string | null;
  onEdit: () => void;
}

export function ProductCard({ name, description, category, price, imageUrl, familyName, onEdit }: ProductCardProps) {
  return (
    <div
      className="group product-card-shadow rounded-xl bg-card overflow-hidden border border-border cursor-pointer"
      onClick={onEdit}
    >
      <div className="relative aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
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
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
            <Pencil className="h-3.5 w-3.5 text-foreground" />
          </div>
        </div>
      </div>

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
          <p className="font-heading font-bold text-lg text-foreground">
            R$ {price.toFixed(2).replace(".", ",")}
          </p>
        )}
      </div>
    </div>
  );
}
