import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, History, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  purchasePrice: string; setPurchasePrice: (v: string) => void;
  purchasePriceVat: string; setPurchasePriceVat: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  priceWithVat?: string | null;
  weight: string; setWeight: (v: string) => void;
  margem: string | null;
  fornecedor?: string | null;
  priceHistory: any[];
  loadingHistory: boolean;
}

export function EditProductPricing(p: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Custo sem IVA (€)</Label>
          <Input type="number" step="0.01" value={p.purchasePrice} onChange={(e) => p.setPurchasePrice(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Custo com IVA (€) <span className="text-muted-foreground text-xs">auto</span></Label>
          <Input type="number" step="0.01" value={p.purchasePriceVat} onChange={(e) => p.setPurchasePriceVat(e.target.value)} className="bg-muted/30" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preço de venda s/ IVA (€)</Label>
          <Input type="number" step="0.01" value={p.price} onChange={(e) => p.setPrice(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Preço de venda c/ IVA (€) <span className="text-muted-foreground text-xs">calc.</span></Label>
          <Input type="number" step="0.01" value={p.priceWithVat ?? ""} readOnly className="bg-muted/30 cursor-default" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Peso (kg)</Label>
          <Input type="number" step="0.001" value={p.weight} onChange={(e) => p.setWeight(e.target.value)} placeholder="0.000" />
        </div>
      </div>
      {p.margem && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground">Margem calculada: </span>
          <span className="font-semibold text-foreground">{p.margem}%</span>
          {p.purchasePrice && p.price && (
            <span className="text-muted-foreground ml-2">
              ({(parseFloat(p.price) - parseFloat(p.purchasePrice)).toFixed(2)}€ de lucro por unidade)
            </span>
          )}
        </div>
      )}
      <Separator />
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Fornecedor: <span className="font-medium capitalize">{p.fornecedor || "—"}</span></p>
        <p>• Portes: ver separador <strong>Portes</strong> no Admin</p>
      </div>

      <Separator />
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Histórico de preços de compra
        </p>
        {p.loadingHistory ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : p.priceHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Sem alterações de preço registadas para este produto.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Data</th>
                  <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Custo</th>
                  <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Venda</th>
                </tr>
              </thead>
              <tbody>
                {p.priceHistory.map((h: any) => {
                  const oldP = h.purchase_price_old;
                  const newP = h.purchase_price_new;
                  const diff = oldP != null && newP != null ? newP - oldP : null;
                  return (
                    <tr key={h.id} className="border-t border-border">
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                        {new Date(h.changed_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        {oldP != null && newP != null ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-muted-foreground line-through">{Number(oldP).toFixed(2)}€</span>
                            <span className="font-medium">{Number(newP).toFixed(2)}€</span>
                            {diff != null && diff !== 0 && (
                              diff > 0
                                ? <TrendingUp className="h-3 w-3 text-destructive" />
                                : <TrendingDown className="h-3 w-3 text-green-600" />
                            )}
                          </span>
                        ) : newP != null ? (
                          <span className="font-medium">{Number(newP).toFixed(2)}€</span>
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground inline" />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        {h.price_old != null && h.price_new != null ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-muted-foreground line-through">{Number(h.price_old).toFixed(2)}€</span>
                            <span className="font-medium">{Number(h.price_new).toFixed(2)}€</span>
                          </span>
                        ) : h.price_new != null ? (
                          <span className="font-medium">{Number(h.price_new).toFixed(2)}€</span>
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground inline" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditProductPricing;
