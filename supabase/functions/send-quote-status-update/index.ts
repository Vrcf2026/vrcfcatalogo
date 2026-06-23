import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Estados que justificam notificar o cliente.
// "in_review" não notifica — é uma transição interna.
// "accepted" também não — o "send-quote-final" já envia o orçamento completo.
const NOTIFY_STATUSES: Record<string, string> = {
  rejected:  "Rejeitado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

async function invokeTransactionalEmail(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) throw new Error("Configuração de email incompleta");

  const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? `Falha ao enviar email (${response.status})`);
  }
  return response.json().catch(() => null);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { quoteId, newStatus } = await req.json();
    if (!quoteId || !newStatus) {
      return new Response(JSON.stringify({ error: "quoteId e newStatus obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusLabel = NOTIFY_STATUSES[newStatus];
    if (!statusLabel) {
      // Estado não requer notificação — retorna sem erro.
      return new Response(JSON.stringify({ skipped: true, reason: `Status "${newStatus}" não notifica cliente` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("quote_number, customer_name, customer_email, notes")
      .eq("id", quoteId)
      .maybeSingle();

    if (error || !quote) throw new Error("Orçamento não encontrado");
    if (!quote.customer_email) {
      return new Response(JSON.stringify({ skipped: true, reason: "sem email do cliente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await invokeTransactionalEmail({
      templateName: "quote-status-update",
      recipientEmail: quote.customer_email,
      idempotencyKey: `quote-status-${quoteId}-${newStatus}-${Date.now()}`,
      templateData: {
        customerName: quote.customer_name ?? "",
        quoteNumber:  quote.quote_number  ?? "",
        statusLabel,
        notes: quote.notes ?? "",
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[send-quote-status-update] error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
