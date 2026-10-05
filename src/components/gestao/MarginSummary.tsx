import { AlertTriangle } from "lucide-react";

export type MarginLine = {
  quantity: number;
  /** Preço unitário de venda com IVA (como está nas linhas do orçamento) */
  unitPriceVat: number;
  /** Custo unitário sem IVA; null para linhas manuais ou sem custo conhecido */
  cost: number | null | undefined;
};

const IVA = 0.23;
const MIN_MARGIN_PCT = 10;
const eur = (v: number) => `${v.toFixed(2).replace(".", ",")} €`;

/** Margem dos produtos do orçamento (sem portes), visível só na gestão. */
export function MarginSummary({ lines }: { lines: MarginLine[] }) {
  const withCost = lines.filter((l) => l.cost != null && l.cost > 0 && l.quantity > 0);
  const unknown = lines.filter((l) => l.quantity > 0 && l.unitPriceVat > 0 && !(l.cost != null && l.cost > 0)).length;
  if (withCost.length === 0) return null;

  const sale = withCost.reduce((s, l) => s + (l.unitPriceVat / (1 + IVA)) * l.quantity, 0);
  const cost = withCost.reduce((s, l) => s + Number(l.cost) * l.quantity, 0);
  const margin = sale - cost;
  const pct = sale > 0 ? (margin / sale) * 100 : 0;
  const low = pct < MIN_MARGIN_PCT;

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs space-y-1 ${low ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/30"}`}>
      <div className="flex justify-between text-muted-foreground">
        <span>Custo (s/ IVA)</span><span>{eur(cost)}</span>
      </div>
      <div className={`flex justify-between font-semibold ${low ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
        <span>Margem</span><span>{eur(margin)} · {pct.toFixed(1).replace(".", ",")}%</span>
      </div>
      {low && (
        <p className="flex items-center gap-1 text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" /> Margem abaixo de {MIN_MARGIN_PCT}%.
        </p>
      )}
      {unknown > 0 && (
        <p className="text-muted-foreground">
          {unknown} linha{unknown !== 1 ? "s" : ""} sem custo conhecido (não entra{unknown !== 1 ? "m" : ""} na margem).
        </p>
      )}
    </div>
  );
}
