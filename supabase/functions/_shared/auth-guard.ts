import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/** Aceita apenas chamadas internas (cron / triggers) com a service role key. */
export function isServiceRoleCall(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const apikey = req.headers.get("apikey")?.trim() ?? "";
  return token === serviceKey || apikey === serviceKey;
}

export type Caller = { userId: string; isStaff: boolean };

/** Valida o JWT do chamador e indica se tem acesso de gestão. */
export async function authenticateCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub as string | undefined;
  if (error || !userId) return null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: isStaff } = await admin.rpc("has_gestao_access", { _user_id: userId });

  return { userId, isStaff: isStaff === true };
}

export function unauthorized(corsHeaders: Record<string, string>, message = "Não autorizado") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function forbidden(corsHeaders: Record<string, string>, message = "Acesso negado") {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
