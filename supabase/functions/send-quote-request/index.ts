import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECIPIENT_EMAIL = "geral@vrcf.pt";

function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, customerPhone, notes, items, sendCopyToCustomer } = await req.json();

    const itemsHtml = (items as any[])
      .map(
        (item: any) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(item.name)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${escapeHtml(item.category || "-")}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${Number(item.quantity) || 0}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${item.price != null ? `${Number(item.price).toFixed(2).replace(".", ",")} €` : "Sob consulta"}</td>
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (LOVABLE_API_KEY) {
      // Send to VRCF
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

      // Send copy to customer if requested
      if (sendCopyToCustomer && customerEmail) {
        const customerHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#1a1a2e;border-bottom:2px solid #0066cc;padding-bottom:10px;">
              📋 Cópia do Seu Pedido de Orçamento - VRCF
            </h2>
            <p style="color:#333;">Olá ${customerName},</p>
            <p style="color:#333;">Segue a cópia do seu pedido de orçamento. Entraremos em contacto brevemente.</p>
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
            ${notes ? `<p style="color:#333;"><strong>Observações:</strong> ${notes}</p>` : ""}
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="color:#666;font-size:12px;">VRCF - VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</p>
            <p style="color:#666;font-size:12px;">📞 +351 911 564 243 | ✉️ geral@vrcf.pt</p>
            <p style="color:#666;font-size:12px;">📍 Rua Luis Calado Nunes 15 LJB, 2870-350 Montijo</p>
          </div>
        `;

        const copyRes = await fetch("https://api.lovable.dev/api/v1/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            to: customerEmail,
            subject: `Cópia do Pedido de Orçamento - VRCF`,
            html: customerHtml,
          }),
        });

        if (!copyRes.ok) {
          const errText = await copyRes.text();
          console.error("Customer copy email failed:", errText);
        }
      }
    } else {
      console.warn("LOVABLE_API_KEY not set, email not sent.");
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
