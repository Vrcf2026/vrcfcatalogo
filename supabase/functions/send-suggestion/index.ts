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
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const requestId = crypto.randomUUID();
    const data = {
      name: String(name),
      email: String(email),
      message: String(message),
    };

    const adminRes = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "suggestion-admin",
        recipientEmail: "geral@vrcf.pt",
        idempotencyKey: `suggestion-admin-${requestId}`,
        templateData: data,
      },
    });
    if (adminRes.error) console.error("Admin suggestion email failed:", adminRes.error);

    const confirmRes = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "suggestion-customer",
        recipientEmail: data.email,
        idempotencyKey: `suggestion-customer-${requestId}`,
        templateData: { name: data.name, message: data.message },
      },
    });
    if (confirmRes.error) console.error("Customer suggestion email failed:", confirmRes.error);

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
