import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function resolveRecipientEmail(): Promise<string> {
  const fallback = "geral@vrcf.pt";
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return fallback;

    const admin = createClient(supabaseUrl, serviceKey);
    const priorities = ["gestor", "admin", "super_admin"] as const;

    for (const role of priorities) {
      const { data: roleRows } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", role);
      if (!roleRows || roleRows.length === 0) continue;

      for (const row of roleRows) {
        const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
        const email = userData?.user?.email;
        if (email) return email;
      }
    }
  } catch (e) {
    console.error("resolveRecipientEmail error:", e);
  }
  return fallback;
}


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
    const { customerName, customerEmail, customerPhone, notes, items, sendCopyToCustomer, shippingEstimate } = await req.json();

    if (!customerName || !customerEmail || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestId = crypto.randomUUID();
    const safeItems = (items as any[]).map((i) => ({
      name: String(i.name ?? ""),
      category: i.category ? String(i.category) : undefined,
      quantity: Number(i.quantity) || 0,
      price: i.price != null ? Number(i.price) : null,
    }));

    await invokeTransactionalEmail({
      templateName: "quote-request-admin",
      recipientEmail: "geral@vrcf.pt",
      idempotencyKey: `quote-admin-${requestId}`,
      templateData: {
        customerName: String(customerName),
        customerEmail: String(customerEmail),
        customerPhone: String(customerPhone ?? ""),
        notes: notes ? String(notes) : "",
        items: safeItems,
        shippingEstimate: shippingEstimate != null ? Number(shippingEstimate) : null,
      },
    });

    if (sendCopyToCustomer && customerEmail) {
      await invokeTransactionalEmail({
        templateName: "quote-request-customer",
        recipientEmail: String(customerEmail),
        idempotencyKey: `quote-customer-${requestId}`,
        templateData: {
          customerName: String(customerName),
          notes: notes ? String(notes) : "",
          items: safeItems,
        },
      });
    }

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
