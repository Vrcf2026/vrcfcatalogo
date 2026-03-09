import { Package, ImageOff } from "lucide-react";

interface ProductCardProps {
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  imageUrl: string | null;
}

export function ProductCard({ name, description, category, price, imageUrl }: ProductCardProps) {
  return (
    <div className="group product-card-shadow rounded-xl bg-card overflow-hidden border border-border">
      <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
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
      </div>

      <div className="p-4 space-y-2">
        {category && (
          <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {category}
          </span>
        )}
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
