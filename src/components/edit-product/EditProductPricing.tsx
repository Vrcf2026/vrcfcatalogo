import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, History, TrendingUp, TrendingDown, Minus, Store, ShoppingCart, Lock, Unlock } from "lucide-react";

interface Props {
  purchasePrice:    string; setPurchasePrice:    (v: string) => void;
  purchasePriceVat: string; setPurchasePriceVat: (v: string) => void;
  price:            string; setPrice:            (v: string) => void;
  priceWithVat?:    string | null;
  storePrice:       string; setStorePrice:       (v: string) => void;
  storePriceVat:    string; setStorePriceVat:    (v: string) => void;
  taxaIva:          string; setTaxaIva:          (v: string) => void;
  priceLocked:      boolean; setPriceLocked:     (v: boolean) => void;
  weight:           string; setWeight:           (v: string) => void;
  margem:           string | null;
  fornecedor?:      string | null;
  priceHistory:     any[];
  loadingHistory:   boolean;
}

export function EditProductPricing(p: Props) {
  const iva        = parseFloat(p.taxaIva) || 23;
  const purchase   = parseFloat(p.purchasePrice) || 0;
  const sale       = parseFloat(p.price) || 0;
  const store      = parseFloat(p.storePrice) || 0;
  const lucroVenda = sale > 0 && purchase > 0 ? (sale - purchase).toFixed(2) : null;
  const lucroLoja  = store > 0 && purchase > 0 ? (store - purchase).toFixed(2) : null;

  return (
    <div className="space-y-5">

      {/* Taxa IVA */}
      <div className="space-y-2">
        <Label>Taxa de IVA</Label>
        <Select value={p.taxaIva} onValueChange={p.setTaxaIva}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6% — Taxa reduzida</SelectItem>
            <SelectItem value="13">13% — Taxa intermédia</SelectItem>
            <SelectItem value="23">23% — Taxa normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Preço de custo */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <ShoppingCart className="h-3.5 w-3.5" /> Preço de Compra (Fornecedor)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Custo s/ IVA (€)</Label>
            <Input type="number" step="0.01" value={p.purchasePrice}
              onChange={(e) => p.setPurchasePrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Custo c/ IVA (€) <span className="text-muted-foreground text-xs">auto ({iva}%)</span></Label>
            <Input type="number" step="0.01" value={p.purchasePriceVat}
              onChange={(e) => p.setPurchasePriceVat(e.target.value)} className="bg-muted/30" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Preço de venda catálogo */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
          Preço de Venda — Catálogo Online
          <button type="button"
            title={p.priceLocked ? "Bloqueado — importação não altera" : "Bloquear preço contra importação"}
            onClick={() => p.setPriceLocked(!p.priceLocked)}
            className={`ml-auto flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              p.priceLocked
                ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
            }`}>
            {p.priceLocked
              ? <><Lock className="h-3 w-3" /> Bloqueado</>
              : <><Unlock className="h-3 w-3" /> Bloquear</>
            }
          </button>
        </p>
        {p.priceLocked && (
          <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/8 border border-primary/20 rounded-lg px-3 py-2 mb-3">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Este preço está bloqueado — as importações automáticas não o vão alterar.
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preço s/ IVA (€)</Label>
            <Input type="number" step="0.01" value={p.price} onChange={(e) => p.setPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Preço c/ IVA (€) <span className="text-muted-foreground text-xs">calc. ({iva}%)</span></Label>
            <Input type="number" step="0.01" value={p.priceWithVat ?? ""} readOnly className="bg-muted/30 cursor-default" />
          </div>
        </div>
        {p.margem && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm mt-3">
            <span className="text-muted-foreground">Margem catálogo: </span>
            <span className="font-semibold">{p.margem}%</span>
            {lucroVenda && <span className="text-muted-foreground ml-2">({lucroVenda}€ por unidade)</span>}
          </div>
        )}
      </div>

      <Separator />

      {/* Preço loja — interno */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1">
          <Store className="h-3.5 w-3.5" /> Preço de Venda — Loja (interno)
        </p>
        <p className="text-xs text-muted-foreground mb-3">Preço para venda presencial. Não aparece no catálogo online.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preço loja s/ IVA (€)</Label>
            <Input type="number" step="0.01" value={p.storePrice} onChange={(e) => p.setStorePrice(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Preço loja c/ IVA (€) <span className="text-muted-foreground text-xs">calc.</span></Label>
            <Input type="number" step="0.01" value={p.storePriceVat} readOnly className="bg-muted/30 cursor-default" />
          </div>
        </div>
        {store > 0 && purchase > 0 && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm mt-3">
            <span className="text-muted-foreground">Margem loja: </span>
            <span className="font-semibold">{((store - purchase) / purchase * 100).toFixed(1)}%</span>
            {lucroLoja && <span className="text-muted-foreground ml-2">({lucroLoja}€ por unidade)</span>}
          </div>
        )}
      </div>

      <Separator />

      {/* Peso */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Peso por unidade (kg)</Label>
          <Input type="number" step="0.001" value={p.weight} onChange={(e) => p.setWeight(e.target.value)} placeholder="0.000" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Fornecedor</Label>
          <p className="text-sm font-medium capitalize pt-2">{p.fornecedor || "—"}</p>
        </div>
      </div>

      <Separator />

      {/* Histórico */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Histórico de preços de compra
        </p>
        {p.loadingHistory ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : p.priceHistory.length === 0 ? (
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
                {p.priceHistory.map((h: any) => {
                  const diff = h.purchase_price_old != null && h.purchase_price_new != null ? h.purchase_price_new - h.purchase_price_old : null;
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
                            {diff != null && diff !== 0 && (diff > 0 ? <TrendingUp className="h-3 w-3 text-destructive" /> : <TrendingDown className="h-3 w-3 text-green-600" />)}
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

export default EditProductPricing;
