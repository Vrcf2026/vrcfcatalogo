import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Estados-chave para notificar o cliente.
const KEY_STATUSES: Record<string, { label: string; description: string }> = {
  approved:     { label: "Aprovado",        description: "O teu pedido foi aprovado e segue para reparação." },
  in_repair:    { label: "Em reparação",    description: "O equipamento foi recebido e está em análise técnica." },
  shipped_back: { label: "Devolvido",       description: "O equipamento foi expedido de volta para a tua morada." },
  completed:    { label: "Concluído",       description: "O processo de RMA foi concluído com sucesso." },
  rejected:     { label: "Rejeitado",       description: "O pedido não pôde ser aceite. Vê as notas para mais detalhes." },
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
    const { rmaId, newStatus } = await req.json();
    if (!rmaId || !newStatus) {
      return new Response(JSON.stringify({ error: "rmaId e newStatus obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Só notifica em estados-chave (preferência do utilizador).
    const statusMeta = KEY_STATUSES[newStatus];
    if (!statusMeta) {
      return new Response(JSON.stringify({ skipped: true, reason: "non-key status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rma, error: rmaErr } = await supabase
      .from("rma_requests")
      .select("id, rma_number, user_id, resolution_notes, customer_profiles(full_name)")
      .eq("id", rmaId)
      .maybeSingle();

    if (rmaErr || !rma) throw new Error("RMA não encontrado");

    // Vai buscar o email do utilizador via auth admin API
    let customerEmail: string | null = null;
    let customerName = (rma as any).customer_profiles?.full_name ?? "";
    if (rma.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(rma.user_id);
      customerEmail = userData?.user?.email ?? null;
      if (!customerName) {
        customerName = (userData?.user?.user_metadata as any)?.full_name ?? "";
      }
    }

    if (!customerEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "no customer email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await invokeTransactionalEmail({
      templateName: "rma-status-update",
      recipientEmail: customerEmail,
      idempotencyKey: `rma-${rmaId}-${newStatus}`,
      templateData: {
        customerName,
        rmaNumber: rma.rma_number,
        statusLabel: statusMeta.label,
        statusDescription: statusMeta.description,
        resolutionNotes: rma.resolution_notes ?? "",
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-rma-update] error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
