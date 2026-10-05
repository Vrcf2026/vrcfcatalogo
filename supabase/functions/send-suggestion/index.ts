import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimits, clientIp, tooManyRequests } from "../_shared/rate-limit.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function invokeTransactionalEmail(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Configuração de email incompleta no servidor");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof data?.error === "string"
      ? data.error
      : `Falha ao enviar email (${response.status})`;
    throw new Error(message);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!EMAIL_RE.test(String(email))) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Formulário público: limitar por IP e por email de destino
    const ip = clientIp(req);
    const allowed = await checkRateLimits([
      { key: `suggestion:ip:${ip}`, max: 5, windowSeconds: 3600 },
      { key: `suggestion:email:${String(email).toLowerCase()}`, max: 3, windowSeconds: 3600 },
    ]);
    if (!allowed) return tooManyRequests(corsHeaders);

    const requestId = crypto.randomUUID();
    const data = {
      name: String(name).slice(0, 120),
      email: String(email).slice(0, 200),
      message: String(message).slice(0, 2000),
    };

    await invokeTransactionalEmail({
      templateName: "suggestion-admin",
      recipientEmail: "geral@vrcf.pt",
      idempotencyKey: `suggestion-admin-${requestId}`,
      templateData: data,
    });

    await invokeTransactionalEmail({
      templateName: "suggestion-customer",
      recipientEmail: data.email,
      idempotencyKey: `suggestion-customer-${requestId}`,
      templateData: { name: data.name, message: data.message },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
