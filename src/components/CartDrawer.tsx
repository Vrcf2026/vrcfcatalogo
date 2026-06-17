import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingCart, Send, XCircle, Truck, Clock, Info, Package } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutDialog } from "./CheckoutDialog";

// Tabela DHL Portugal Continental (s/IVA) — custo real cobrado pela DHL
const DHL_TABELA: [number, number][] = [
  [1, 3.65], [3, 3.78], [5, 3.78], [10, 4.37], [20, 4.88],
  [30, 5.20], [40, 6.22], [50, 7.59], [60, 9.08], [70, 10.59],
  [80, 12.11], [90, 13.62], [100, 15.13], [125, 18.51], [150, 22.22],
  [175, 25.92], [200, 29.62], [225, 33.33], [250, 37.03],
];

const MARGEM_PORTES = 0.15;

function calcularPorteDHL(pesoKg: number): number | null {
  let custoBase: number | null = null;
  for (const [limite, preco] of DHL_TABELA) {
    if (pesoKg <= limite) { custoBase = preco; break; }
  }
  if (pesoKg <= 0) custoBase = DHL_TABELA[0][1];
  if (custoBase === null) return null;
  return Math.round(custoBase * (1 + MARGEM_PORTES) * 100) / 100;
}

export function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Configuração de portes da BD (Visiotech, Diginova, etc.)
  const { data: shippingConfigs = [] } = useQuery({
    queryKey: ["shipping_config"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_config").select("*").eq("ativo", true);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalValueSemVat = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
  const totalValueComVat = totalValueSemVat * 1.23;

  // Agrupar itens por fornecedor
  const itensPorFornecedor = items.reduce((acc: Record<string, typeof items>, item) => {
    const f = (item as any).fornecedor || "manual";
    if (!acc[f]) acc[f] = [];
    acc[f].push(item);
    return acc;
  }, {});

  // Calcular portes por fornecedor
  const portesPorFornecedor: Array<{
    fornecedor: string;
    portesSemIva: number;
    portesComIva: number;
    descricao: string;
    isDHL?: boolean;
  }> = [];

  const temEnvioEspecial = items.some(i => (i as any).envio_especial);

  for (const [fornecedor, itensF] of Object.entries(itensPorFornecedor)) {
    if (fornecedor === "allto") {
      // ALL.TO: cálculo por peso via tabela DHL
      const pesoAllto = itensF.reduce((sum, i) => sum + ((i as any).weight ?? 0) * i.quantity, 0);
      if (pesoAllto > 0) {
        const porte = calcularPorteDHL(pesoAllto);
        if (porte !== null) {
          portesPorFornecedor.push({
            fornecedor: "allto",
            portesSemIva: porte,
            portesComIva: porte * 1.23,
            descricao: `${pesoAllto.toFixed(2)}kg · DHL`,
            isDHL: true,
          });
        } else {
          portesPorFornecedor.push({
            fornecedor: "allto",
            portesSemIva: 0,
            portesComIva: 0,
            descricao: "Peso >250kg — calculado no orçamento",
          });
        }
      }
    } else {
      // Outros fornecedores: configuração da BD (preco_primeira_unidade + adicional)
      const config = shippingConfigs.find((c: any) => c.fornecedor === fornecedor);
      if (config && config.ativo) {
        const totalItens = itensF.reduce((sum, i) => sum + i.quantity, 0);
        const primeira = config.preco_primeira_unidade ?? 0;
        const adicional = config.preco_unidade_adicional ?? 0;
        const portesSemIva = totalItens > 0
          ? primeira + Math.max(0, totalItens - 1) * adicional
          : primeira;
        portesPorFornecedor.push({
          fornecedor,
          portesSemIva,
          portesComIva: portesSemIva * 1.23,
          descricao: `${totalItens} artigo${totalItens !== 1 ? "s" : ""}`,
        });
      }
    }
  }

  const pesoTotal = items.reduce((sum, i) => sum + ((i as any).weight ?? 0) * i.quantity, 0);
  const totalPortesComIva = portesPorFornecedor.reduce((s, p) => s + p.portesComIva, 0);
  const temPortesCalculados = Object.keys(itensPorFornecedor).some(f =>
    f !== "allto" && !shippingConfigs.find((c: any) => c.fornecedor === f && c.ativo)
  );

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
                      {(item as any).weight > 0 && (
                        <p className="text-[10px] text-muted-foreground">{(item as any).weight} kg/un.</p>
                      )}
                      {(item as any).minSaleQty > 1 && (
                        <p className="text-[10px] text-muted-foreground">Embalagem de {(item as any).minSaleQty} unidades</p>
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
                  {pesoTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" /> Peso total:
                      </span>
                      <span className="font-semibold">{pesoTotal.toFixed(2)} kg</span>
                    </div>
                  )}
                  {totalValueSemVat > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal s/ IVA:</span>
                        <span className="font-semibold">{totalValueSemVat.toFixed(2).replace(".", ",")} €</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total produtos c/ IVA:</span>
                        <span className="text-primary">{totalValueComVat.toFixed(2).replace(".", ",")} €</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Portes por fornecedor */}
                {portesPorFornecedor.length > 0 && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-2">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-primary" />
                      Portes estimados
                    </p>
                    {portesPorFornecedor.map((p) => (
                      <div key={p.fornecedor} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {p.fornecedor} <span className="text-[10px]">({p.descricao})</span>
                        </span>
                        <span className="font-semibold">
                          {p.portesComIva > 0
                            ? `${p.portesComIva.toFixed(2).replace(".", ",")} €`
                            : "ver orçamento"}
                        </span>
                      </div>
                    ))}
                    {portesPorFornecedor.length > 1 && totalPortesComIva > 0 && (
                      <div className="flex justify-between text-sm font-bold border-t border-primary/20 pt-1.5 mt-1.5">
                        <span>Total portes c/ IVA:</span>
                        <span className="text-primary">{totalPortesComIva.toFixed(2).replace(".", ",")} €</span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">Portugal Continental · valores indicativos</p>
                  </div>
                )}

                {/* Notas */}
                <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-2 text-xs text-muted-foreground">
                  {temPortesCalculados && (
                    <div className="flex items-start gap-1.5">
                      <Truck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span>Portes de alguns produtos calculados no orçamento final.</span>
                    </div>
                  )}
                  {temEnvioEspecial && (
                    <div className="flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span>Um ou mais produtos têm condições especiais de envio.</span>
                    </div>
                  )}
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
