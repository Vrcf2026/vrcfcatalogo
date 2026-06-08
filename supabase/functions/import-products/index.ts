import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-import-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth via x-import-key
    const importKey = req.headers.get("x-import-key");
    const expectedKey = Deno.env.get("IMPORT_API_KEY");
    if (!expectedKey || importKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.produtos) || typeof body.fornecedor !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid body. Expected { produtos: [], fornecedor: string }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { produtos, fornecedor } = body as { produtos: any[]; fornecedor: string };

    if (produtos.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure fornecedor is set on each product
    const rows = produtos.map((p) => ({ ...p, fornecedor: p.fornecedor ?? fornecedor }));
    console.log("First row payload:", JSON.stringify(rows[0]));

    // Upsert in batches of 100 by sku
    const batchSize = 100;
    let count = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error, data } = await supabase
        .from("products")
        .upsert(batch, { onConflict: "sku" })
        .select("id");
      if (error) {
        console.error("Upsert error:", error);
        return new Response(
          JSON.stringify({ error: error.message, processed: count }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      count += data?.length ?? batch.length;
    }

    return new Response(JSON.stringify({ success: true, count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-products error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
