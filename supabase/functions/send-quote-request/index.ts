import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, customerPhone, notes, items, sendCopyToCustomer } = await req.json();

    if (!customerName || !customerEmail || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const requestId = crypto.randomUUID();
    const safeItems = (items as any[]).map((i) => ({
      name: String(i.name ?? ""),
      category: i.category ? String(i.category) : undefined,
      quantity: Number(i.quantity) || 0,
      price: i.price != null ? Number(i.price) : null,
    }));

    // Send to VRCF (admin)
    const adminRes = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "quote-request-admin",
        recipientEmail: "geral@vrcf.pt",
        idempotencyKey: `quote-admin-${requestId}`,
        templateData: {
          customerName: String(customerName),
          customerEmail: String(customerEmail),
          customerPhone: String(customerPhone ?? ""),
          notes: notes ? String(notes) : "",
          items: safeItems,
        },
      },
    });
    if (adminRes.error) {
      console.error("Admin email failed:", adminRes.error);
    }

    // Customer copy
    if (sendCopyToCustomer && customerEmail) {
      const copyRes = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "quote-request-customer",
          recipientEmail: String(customerEmail),
          idempotencyKey: `quote-customer-${requestId}`,
          templateData: {
            customerName: String(customerName),
            notes: notes ? String(notes) : "",
            items: safeItems,
          },
        },
      });
      if (copyRes.error) {
        console.error("Customer copy failed:", copyRes.error);
      }
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
