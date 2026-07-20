import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, Package, Search } from "lucide-react";

export function GestorProductList() {
  const [q, setQ] = useState("");
  const [fornecedor, setFornecedor] = useState("todos");

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["gestor-products", q, fornecedor],
    queryFn: async () => {
      let query = supabase.from("products")
        .select("id,name,sku,price,taxa_iva,image_url,stock_status,weight,category")
        .eq("include_in_catalog", true)
        .order("name")
        .limit(50);
      if (q.length > 1) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`) as any;
      const { data } = await query;
      let rows = (data ?? []) as any[];
      if (rows.length) {
        const { data: pricing } = await (supabase as any).rpc("get_products_internal_pricing", { p_ids: rows.map(r => r.id) });
        const map = new Map<string, any>();
        for (const row of (pricing ?? []) as any[]) map.set(row.id, row);
        rows = rows.map(r => ({ ...r, ...(map.get(r.id) ?? {}) }));
        if (fornecedor !== "todos") rows = rows.filter(r => r.fornecedor === fornecedor);
      }
      return rows;
    },
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-3 overflow-hidden">
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Nome ou REF..." className="pl-9 h-9" />
        </div>
        <select value={fornecedor} onChange={e => setFornecedor(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="todos">Todos</option>
          <option value="visiotech">Segurança</option>
          <option value="diginova">Informática</option>
          <option value="allto">Economato</option>
        </select>
      </div>
      <div className="overflow-y-auto flex-1 space-y-1">
        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {!isLoading && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado.</p>}
        {results.map((p: any) => {
          const iva = (Number(p.taxa_iva) || 23) / 100;
          const priceVat = p.price ? (Number(p.price) * (1 + iva)).toFixed(2) : null;
          return (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/30">
              {p.image_url
                ? <img src={p.image_url} alt="" className="h-10 w-10 object-cover rounded bg-muted shrink-0" />
                : <div className="h-10 w-10 bg-muted rounded flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.sku && <span className="font-mono mr-2">REF: {p.sku}</span>}
                  {p.category && <span className="mr-2">{p.category}</span>}
                  {p.weight && <span className="mr-2">{p.weight}kg</span>}
                  {p.stock_status === "on_request" && <span className="text-amber-600">⚠ Por encomenda</span>}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                {priceVat && <p className="text-sm font-bold">{priceVat.replace(".",",")} €</p>}
                {p.purchase_price && <p className="text-[10px] text-amber-600">Custo: {Number(p.purchase_price).toFixed(2)}€</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
