import { useState } from "react";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  /** Quantidade mínima (MOQ). Default: 1. */
  minQty?: number;
  /** Callback chamado ao confirmar — recebe a quantidade escolhida. */
  onAdd: (qty: number) => void;
  /** Callback para fechar o seletor sem adicionar (só no card). */
  onCancel?: () => void;
  /** Modo compacto — para usar dentro do ProductCard. */
  compact?: boolean;
  /** Label do botão de confirmar. */
  label?: string;
}

/**
 * Seletor de quantidade reutilizável.
 * - Respeita MOQ: quantidade mínima e incrementos iguais ao minQty.
 * - Modo compact: versão inline para o ProductCard (overlay na imagem).
 * - Modo normal: versão maior para a página de produto.
 */
export function QuantitySelector({
  minQty = 1,
  onAdd,
  onCancel,
  compact = false,
  label = "Adicionar ao orçamento",
}: QuantitySelectorProps) {
  const step = minQty > 1 ? minQty : 1;
  const [qty, setQty] = useState(step);

  const decrement = () => setQty((q) => Math.max(step, q - step));
  const increment = () => setQty((q) => q + step);

  const handleChange = (val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < step) return;
    // Arredondar ao múltiplo de step mais próximo
    const rounded = Math.max(step, Math.round(n / step) * step);
    setQty(rounded);
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5 p-2 bg-background/95 backdrop-blur-sm rounded-xl border border-border shadow-lg">
        {/* Linha de quantidade */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={decrement}
            disabled={qty <= step}
            className="h-7 w-7 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
          >
            <Minus className="h-3 w-3" />
          </button>
          <input
            type="number"
            value={qty}
            min={step}
            step={step}
            onChange={(e) => handleChange(e.target.value)}
            className="w-12 h-7 text-center text-sm font-bold border border-border rounded-lg bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={increment}
            className="h-7 w-7 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* Botão confirmar */}
        <button
          type="button"
          onClick={() => onAdd(qty)}
          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all"
        >
          <ShoppingCart className="h-3.5 w-3.5" /> Adicionar
        </button>
        {minQty > 1 && (
          <p className="text-[9px] text-muted-foreground text-center">
            Embalagem mínima: {minQty} un.
          </p>
        )}
      </div>
    );
  }

  // Modo normal — página de produto
  return (
    <div className="flex flex-col gap-3">
      {minQty > 1 && (
        <p className="text-xs text-muted-foreground">
          Embalagem mínima: <span className="font-semibold text-foreground">{minQty} un.</span> — incrementos de {minQty} em {minQty}.
        </p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-border rounded-xl overflow-hidden bg-card">
          <button
            type="button"
            onClick={decrement}
            disabled={qty <= step}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            value={qty}
            min={step}
            step={step}
            onChange={(e) => handleChange(e.target.value)}
            className="w-14 h-10 text-center text-base font-bold bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={increment}
            className="h-10 w-10 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button
          onClick={() => onAdd(qty)}
          className="flex-1 gap-2 h-10"
        >
          <ShoppingCart className="h-4 w-4" />
          {label}
        </Button>
      </div>
    </div>
  );
}
