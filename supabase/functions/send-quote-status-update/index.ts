import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Estados que justificam notificar o cliente quando a alteração parte da equipa.
// "in_review" não notifica — é uma transição interna.
// "accepted" também não — o "send-quote-final" já envia o orçamento completo.
const NOTIFY_STATUSES: Record<string, string> = {
  rejected:  "Rejeitado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

// Quando a alteração parte do cliente, notificamos o gestor.
const CUSTOMER_DECISION_LABELS: Record<string, string> = {
  accepted: "Aceite",
  rejected: "Rejeitado",
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

async function resolveGestorEmail(supabase: ReturnType<typeof createClient>): Promise<string> {
  for (const role of ["gestor", "admin", "super_admin"]) {
    const { data } = await supabase.rpc("get_users_with_roles");
    if (Array.isArray(data)) {
      const match = data.find((u: any) => Array.isArray(u.roles) && u.roles.includes(role) && u.email);
      if (match?.email) return match.email;
    }
  }
  return "geral@vrcf.pt";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { quoteId, newStatus, triggeredBy } = await req.json();
    if (!quoteId || !newStatus) {
      return new Response(JSON.stringify({ error: "quoteId e newStatus obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // === Decisão tomada pelo cliente → notificar gestor ===
    if (triggeredBy === "customer") {
      const decisionLabel = CUSTOMER_DECISION_LABELS[newStatus];
      if (!decisionLabel) {
        return new Response(JSON.stringify({ skipped: true, reason: `Decisão "${newStatus}" não notifica gestor` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const gestorEmail = await resolveGestorEmail(supabase);

      await invokeTransactionalEmail({
        templateName: "quote-customer-decision-gestor",
        recipientEmail: gestorEmail,
        idempotencyKey: `quote-decision-${quoteId}-${newStatus}-${Date.now()}`,
        templateData: {
          customerName: quote.customer_name ?? "",
          customerEmail: quote.customer_email ?? "",
          quoteNumber:  quote.quote_number  ?? "",
          decisionLabel,
          decision: newStatus,
          notes: quote.notes ?? "",
        },
      });

      return new Response(JSON.stringify({ success: true, notified: "gestor" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Alteração interna pela equipa → notificar cliente ===
    const statusLabel = NOTIFY_STATUSES[newStatus];
    if (!statusLabel) {
      return new Response(JSON.stringify({ skipped: true, reason: `Status "${newStatus}" não notifica cliente` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    return new Response(JSON.stringify({ success: true, notified: "customer" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[send-quote-status-update] error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
