import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Escalão do cliente (1 = preço normal; 2/3 = preços de empresa) ─────────
export function useMyPriceTier(): number {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-price-tier", user?.id],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_profiles").select("price_tier").eq("user_id", user!.id).maybeSingle();
      if (error) return 1; // coluna ainda não existe (migração por aplicar)
      return Number(data?.price_tier) || 1;
    },
  });
  return data ?? 1;
}

// ── Carregamento em lote: vários cards na mesma página = um só pedido ──────
type Waiter = (v: number | null) => void;
let queue = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  const batch = queue;
  queue = new Map();
  timer = null;
  const ids = [...batch.keys()];
  const result = new Map<string, number>();
  try {
    const { data } = await (supabase as any).rpc("get_my_tier_prices", { p_ids: ids });
    for (const r of (data ?? []) as { id: string; price: number }[]) result.set(r.id, Number(r.price));
  } catch { /* sem preço de escalão: fica o normal */ }
  for (const [id, waiters] of batch) waiters.forEach((w) => w(result.get(id) ?? null));
}

function loadTierPrice(id: string): Promise<number | null> {
  return new Promise((resolve) => {
    const list = queue.get(id) ?? [];
    list.push(resolve);
    queue.set(id, list);
    if (!timer) timer = setTimeout(flush, 30);
  });
}

/**
 * Preço (sem IVA) a mostrar a este cliente. Para clientes com escalão 2/3 devolve o preço
 * de empresa quando o produto o tem; caso contrário, o preço normal.
 */
export function useTierPrice(id: string | undefined, basePrice: number | null) {
  const { user } = useAuth();
  const tier = useMyPriceTier();
  const { data } = useQuery({
    queryKey: ["tier-price", user?.id, tier, id],
    enabled: !!user && tier > 1 && !!id && basePrice != null,
    staleTime: 10 * 60 * 1000,
    queryFn: () => loadTierPrice(id!),
  });
  const isTier = data != null && basePrice != null && data < basePrice;
  return { price: isTier ? data : basePrice, basePrice, isTier };
}
