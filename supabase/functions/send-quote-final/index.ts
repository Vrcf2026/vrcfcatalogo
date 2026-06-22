import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function invokeTransactionalEmail(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: "quoteId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: quote, error: qErr }, { data: items, error: iErr }] = await Promise.all([
      supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle(),
      supabase.from("quote_items").select("*").eq("quote_id", quoteId),
    ]);
    if (qErr || !quote) throw new Error("Orçamento não encontrado");
    if (iErr) throw iErr;

    if (!quote.customer_email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no customer email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subtotal = Number(quote.subtotal ?? 0);
    const shippingTotal = quote.shipping_total != null ? Number(quote.shipping_total) : 0;
    const total = quote.total != null ? Number(quote.total) : subtotal + shippingTotal;

    await invokeTransactionalEmail({
      templateName: "quote-final-customer",
      recipientEmail: quote.customer_email,
      idempotencyKey: `quote-final-${quoteId}-${Date.now()}`,
      templateData: {
        customerName: quote.customer_name ?? "",
        quoteNumber: quote.quote_number ?? "",
        items: (items ?? []).map((i: any) => ({
          name: i.product_name_snapshot,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          lineTotal: i.line_total,
        })),
        subtotal,
        shippingTotal: quote.shipping_total != null ? shippingTotal : null,
        prazoEntrega: quote.prazo_entrega ?? "",
        total,
        notes: quote.notes ?? "",
      },
    });

    await supabase.from("quotes").update({ sent_final_at: new Date().toISOString() }).eq("id", quoteId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-quote-final] error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
