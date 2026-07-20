import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function TabelaPortes() {
  const DHL_TABELA: [number, number][] = [
    [1, 3.65], [3, 3.78], [5, 3.78], [10, 4.37], [20, 4.88],
    [30, 5.20], [40, 6.22], [50, 7.59], [60, 9.08], [70, 10.59],
    [80, 12.11], [90, 13.62], [100, 15.13], [125, 18.51], [150, 22.22],
    [175, 25.92], [200, 29.62], [225, 33.33], [250, 37.03],
  ];
  const MARGEM = 0.15;

  const { data: configs = [] } = useQuery({
    queryKey: ["shipping_config"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_config").select("*").eq("ativo", true).order("fornecedor");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      {configs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Por fornecedor</p>
          <div className="space-y-1">
            {configs.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span className="capitalize font-medium">{c.fornecedor}</span>
                <div className="text-right text-xs text-muted-foreground">
                  <span>1ª un: {Number(c.preco_primeira_unidade ?? 0).toFixed(2)}€</span>
                  <span className="ml-2">+un: {Number(c.preco_unidade_adicional ?? 0).toFixed(2)}€</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          DHL por peso (Portugal Continental) — margem 15%
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Até (kg)</th>
                <th className="text-right px-3 py-2 font-medium">Custo s/IVA</th>
                <th className="text-right px-3 py-2 font-medium">Cobrado s/IVA</th>
                <th className="text-right px-3 py-2 font-medium">c/IVA</th>
              </tr>
            </thead>
            <tbody>
              {DHL_TABELA.map(([peso, custo]) => {
                const cobrado = custo * (1 + MARGEM);
                const comIva = cobrado * 1.23;
                return (
                  <tr key={peso} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono">{peso} kg</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">{custo.toFixed(2)}€</td>
                    <td className="px-3 py-1.5 text-right">{cobrado.toFixed(2)}€</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-primary">{comIva.toFixed(2)}€</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
