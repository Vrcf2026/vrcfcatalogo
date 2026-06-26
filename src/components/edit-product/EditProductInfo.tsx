import { Separator } from "@/components/ui/separator";
import { Loader2, History, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  product:         any;
  priceHistory?:   any[];
  loadingHistory?: boolean;
}

export function EditProductInfo({ product, priceHistory = [], loadingHistory = false }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {[
          { label: "SKU",            value: product?.sku },
          { label: "Fornecedor",     value: product?.fornecedor },
          { label: "Mundo",          value: product?.mundo },
          { label: "ID",             value: product?.id },
          { label: "Criado em",      value: product?.created_at ? new Date(product.created_at).toLocaleString("pt-PT") : null },
          { label: "Actualizado em", value: product?.updated_at ? new Date(product.updated_at).toLocaleString("pt-PT") : null },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium font-mono">{value || "—"}</span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Histórico de preços de compra
        </p>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : priceHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sem alterações registadas.</p>
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
                {priceHistory.map((h: any) => {
                  const diff = h.purchase_price_old != null && h.purchase_price_new != null
                    ? h.purchase_price_new - h.purchase_price_old : null;
                  return (
                    <tr key={h.id} className="border-t border-border">
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                        {new Date(h.changed_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        {h.purchase_price_old != null && h.purchase_price_new != null ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-muted-foreground line-through">{Number(h.purchase_price_old).toFixed(2)}€</span>
                            <span className="font-medium">{Number(h.purchase_price_new).toFixed(2)}€</span>
                            {diff != null && diff !== 0 && (diff > 0
                              ? <TrendingUp className="h-3 w-3 text-destructive" />
                              : <TrendingDown className="h-3 w-3 text-green-600" />)}
                          </span>
                        ) : h.purchase_price_new != null ? (
                          <span className="font-medium">{Number(h.purchase_price_new).toFixed(2)}€</span>
                        ) : <Minus className="h-3 w-3 text-muted-foreground inline" />}
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        {h.price_old != null && h.price_new != null ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-muted-foreground line-through">{Number(h.price_old).toFixed(2)}€</span>
                            <span className="font-medium">{Number(h.price_new).toFixed(2)}€</span>
                          </span>
                        ) : h.price_new != null ? (
                          <span className="font-medium">{Number(h.price_new).toFixed(2)}€</span>
                        ) : <Minus className="h-3 w-3 text-muted-foreground inline" />}
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

export default EditProductInfo;
