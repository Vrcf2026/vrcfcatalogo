import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Package } from "lucide-react";

export function ProductSearchModal({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (p: any) => void;
}) {
  const [q, setQ] = useState("");
  const { data: results = [], isLoading } = useQuery({
    queryKey: ["gestao-product-search", q],
    enabled: q.length > 2,
    queryFn: async () => {
      const { data } = await supabase.from("products")
        .select("id,name,sku,price,image_url,stock_status,taxa_iva")
        .eq("include_in_catalog", true)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .limit(20);
      let rows = (data ?? []) as any[];
      if (rows.length) {
        const { data: pricing } = await (supabase as any).rpc("get_products_internal_pricing", { p_ids: rows.map(r => r.id) });
        const map = new Map<string, any>();
        for (const row of (pricing ?? []) as any[]) map.set(row.id, row);
        rows = rows.map(r => ({ ...r, ...(map.get(r.id) ?? {}) }));
      }
      return rows;
    },
    staleTime: 30_000,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pesquisar produto</DialogTitle>
        </DialogHeader>
        <Input autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Nome ou referência (mín. 3 letras)..." className="shrink-0" />
        <div className="overflow-y-auto flex-1 space-y-1 mt-2">
          {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          {!isLoading && q.length > 2 && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>
          )}
          {results.map((p: any) => {
            const iva = (Number(p.taxa_iva) || 23) / 100;
            const priceVat = p.price ? Number(p.price) * (1 + iva) : null;
            return (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-border"
                onClick={() => { onSelect(p); onClose(); setQ(""); }}>
                {p.image_url
                  ? <img src={p.image_url} alt="" className="h-10 w-10 object-cover rounded bg-muted shrink-0" />
                  : <div className="h-10 w-10 bg-muted rounded flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku && <span className="font-mono mr-2">REF: {p.sku}</span>}
                    {p.fornecedor && <span className="mr-2">{p.fornecedor}</span>}
                    {p.stock_status === "on_request" && <span className="text-amber-600">⚠ Por encomenda</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {priceVat && <p className="text-sm font-bold">{priceVat.toFixed(2).replace(".",",")} €</p>}
                  {p.purchase_price && <p className="text-[10px] text-amber-600">Custo: {Number(p.purchase_price).toFixed(2)}€</p>}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
