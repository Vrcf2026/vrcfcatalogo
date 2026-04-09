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
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a1a2e;border-bottom:2px solid #0066cc;padding-bottom:10px;">
          💡 Nova Sugestão - Catálogo VRCF
        </h2>
        <table style="width:100%;margin-bottom:20px;">
          <tr><td style="padding:4px;font-weight:bold;">Nome:</td><td>${name}</td></tr>
          <tr><td style="padding:4px;font-weight:bold;">Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>
        </table>
        <h3 style="color:#333;">Mensagem</h3>
        <p style="color:#333;background:#f5f5f5;padding:15px;border-radius:8px;">${message.replace(/\n/g, "<br/>")}</p>
        <p style="color:#666;font-size:12px;">Este email foi gerado automaticamente pelo catálogo online VRCF.</p>
      </div>
    `;

    const confirmHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a1a2e;border-bottom:2px solid #0066cc;padding-bottom:10px;">
          ✅ Sugestão Recebida - VRCF
        </h2>
        <p style="color:#333;">Olá ${name},</p>
        <p style="color:#333;">Agradecemos a sua sugestão! A sua opinião é muito importante para nós.</p>
        <p style="color:#333;"><strong>A sua mensagem:</strong></p>
        <p style="color:#555;background:#f5f5f5;padding:15px;border-radius:8px;">${message.replace(/\n/g, "<br/>")}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <p style="color:#666;font-size:12px;">VRCF - VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</p>
        <p style="color:#666;font-size:12px;">📞 +351 911 564 243 | ✉️ geral@vrcf.pt</p>
        <p style="color:#666;font-size:12px;">📍 Rua Luis Calado Nunes 15 LJB, 2870-350 Montijo</p>
      </div>
    `;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (LOVABLE_API_KEY) {
      // Send to VRCF
      await fetch("https://api.lovable.dev/api/v1/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          to: RECIPIENT_EMAIL,
          subject: `Nova Sugestão - ${name}`,
          html,
          replyTo: email,
        }),
      });

      // Send confirmation to sender
      await fetch("https://api.lovable.dev/api/v1/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          to: email,
          subject: `Sugestão Recebida - VRCF`,
          html: confirmHtml,
        }),
      });
    } else {
      console.warn("LOVABLE_API_KEY not set, emails not sent.");
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
