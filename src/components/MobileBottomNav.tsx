import { Home, Search, LayoutGrid, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileBottomNavProps {
  onSearchClick: () => void;
  onCategoriesClick: () => void;
}

export const MobileBottomNav = ({ onSearchClick, onCategoriesClick }: MobileBottomNavProps) => {
  const { totalItems, setIsOpen } = useCart();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-bottom">
      <div className="flex items-center justify-around py-2">
        <button
          onClick={scrollToTop}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Início</span>
        </button>

        <button
          onClick={onSearchClick}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-medium">Pesquisar</span>
        </button>

        <button
          onClick={onCategoriesClick}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] font-medium">Categorias</span>
        </button>

        <button
          onClick={() => setIsOpen(true)}
          className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[10px] font-medium">Orçamento</span>
          {totalItems > 0 && (
            <span className="absolute top-0 right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
