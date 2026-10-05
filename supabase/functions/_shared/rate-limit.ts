import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/** IP do cliente (primeiro da cadeia x-forwarded-for). */
export function clientIp(req: Request): string {
  const first = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || first || req.headers.get("x-real-ip") || "unknown";
}

export type Limit = { key: string; max: number; windowSeconds: number };

/**
 * Verifica vários limites de uma vez. Devolve true se o pedido pode seguir.
 * Fail-open: se a tabela/função ainda não existir (migração por aplicar) ou a BD
 * falhar, deixa passar e regista o erro — preferível a partir os formulários.
 */
export async function checkRateLimits(limits: Limit[]): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return true;
  const sb = createClient(url, key);
  for (const l of limits) {
    const { data, error } = await sb.rpc("check_rate_limit", {
      p_key: l.key,
      p_max: l.max,
      p_window_seconds: l.windowSeconds,
    });
    if (error) {
      console.error("rate-limit indisponível (fail-open):", error.message);
      return true;
    }
    if (data === false) return false;
  }
  return true;
}

export function tooManyRequests(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Demasiados pedidos. Tente novamente daqui a pouco." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
