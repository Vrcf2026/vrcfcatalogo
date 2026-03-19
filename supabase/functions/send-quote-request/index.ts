import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENT_EMAIL = "geral@vrcf.pt";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, customerPhone, notes, items } = await req.json();

    const itemsHtml = items
      .map(
        (item: any) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.name}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.category || "-"}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.price != null ? `${item.price.toFixed(2).replace(".", ",")} €` : "Sob consulta"}</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a1a2e;border-bottom:2px solid #0066cc;padding-bottom:10px;">
          📋 Novo Pedido de Orçamento - VRCF
        </h2>
        <h3 style="color:#333;">Dados do Cliente</h3>
        <table style="width:100%;margin-bottom:20px;">
          <tr><td style="padding:4px;font-weight:bold;">Nome:</td><td>${customerName}</td></tr>
          <tr><td style="padding:4px;font-weight:bold;">Email:</td><td><a href="mailto:${customerEmail}">${customerEmail}</a></td></tr>
          <tr><td style="padding:4px;font-weight:bold;">Telefone:</td><td>${customerPhone}</td></tr>
          ${notes ? `<tr><td style="padding:4px;font-weight:bold;">Observações:</td><td>${notes}</td></tr>` : ""}
        </table>
        <h3 style="color:#333;">Produtos Solicitados</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Produto</th>
              <th style="padding:8px;border:1px solid #ddd;">Categoria</th>
              <th style="padding:8px;border:1px solid #ddd;">Qtd</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Preço Unit.</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p style="color:#666;font-size:12px;">Este email foi gerado automaticamente pelo catálogo online VRCF.</p>
      </div>
    `;

    // Use Lovable API to send email
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (LOVABLE_API_KEY) {
      const emailRes = await fetch("https://api.lovable.dev/api/v1/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          to: RECIPIENT_EMAIL,
          subject: `Novo Pedido de Orçamento - ${customerName}`,
          html,
          replyTo: customerEmail,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Email send failed:", errText);
      }
    } else {
      console.warn("LOVABLE_API_KEY not set, email not sent. Quote stored in DB.");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
