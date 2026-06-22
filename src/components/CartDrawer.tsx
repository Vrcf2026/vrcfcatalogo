import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingCart, XCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  const totalComIva = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0) * 1.23;
  const totalArtigos = items.reduce((s, i) => s + i.quantity, 0);

  const handleVerOrcamento = () => {
    setIsOpen(false);
    navigate("/orcamento");
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Pedido de Orçamento
            {totalArtigos > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {totalArtigos} artigo{totalArtigos !== 1 ? "s" : ""}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <ShoppingCart className="h-14 w-14 opacity-25" />
            <p className="text-sm font-medium">O seu orçamento está vazio</p>
            <p className="text-xs text-center max-w-[200px]">Adicione produtos do catálogo para pedir orçamento</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-destructive gap-1 text-xs h-7" onClick={clearCart}>
                <XCircle className="h-3.5 w-3.5" /> Limpar tudo
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 py-1">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-border bg-card">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-contain bg-muted flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-2 leading-snug">{item.name}</p>
                    {item.category && (
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold">{item.category}</span>
                    )}
                    {item.price != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(item.price * 1.23).toFixed(2).replace(".", ",")} € c/IVA/un.
                      </p>
                    )}
                    {(item as any).minSaleQty > 1 && (
                      <p className="text-[10px] text-muted-foreground">Embalagem de {(item as any).minSaleQty} un.</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity - ((item as any).minSaleQty > 1 ? (item as any).minSaleQty : 1))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity + ((item as any).minSaleQty > 1 ? (item as any).minSaleQty : 1))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 border-t border-border pt-4 space-y-3">
              <div className="flex justify-between text-sm font-bold">
                <span>Total produtos c/ IVA</span>
                <span className="text-primary">{totalComIva.toFixed(2).replace(".", ",")} €</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Portes calculados no passo seguinte.</p>
              <Button className="w-full gap-2 h-11 rounded-xl font-bold" size="lg" onClick={handleVerOrcamento}>
                Rever Orçamento <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
