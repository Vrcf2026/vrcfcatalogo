import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingCart, Send, XCircle, Truck, Clock, Info } from "lucide-react";
import { useState } from "react";
import { CheckoutDialog } from "./CheckoutDialog";

export function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totalValueSemVat = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
  const totalValueComVat = totalValueSemVat * 1.23;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Pedido de Orçamento
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

              <div className="flex-1 overflow-y-auto space-y-2.5 py-1">
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
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive hover:text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                {/* Totais */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Artigos:</span>
                    <span className="font-semibold">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                  </div>
                  {totalValueSemVat > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal s/ IVA:</span>
                        <span className="font-semibold">{totalValueSemVat.toFixed(2).replace(".", ",")} €</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total c/ IVA (23%):</span>
                        <span className="text-primary">{totalValueComVat.toFixed(2).replace(".", ",")} €</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Notas */}
                <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-1.5">
                    <Truck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <span>Portes calculados no orçamento. Produtos com envio especial têm condições específicas.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <span>Entrega em 48h a 72h úteis após confirmação de pagamento.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <span>Preços indicativos. Stock referente ao armazém online.</span>
                  </div>
                </div>

                <Button className="w-full gap-2 h-11 rounded-xl font-bold" size="lg"
                  onClick={() => { setIsOpen(false); setCheckoutOpen(true); }}>
                  <Send className="h-4 w-4" /> Pedir Orçamento
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
}
