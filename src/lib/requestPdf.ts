/**
 * PDF do Pedido de Orçamento — via HTML impresso.
 */

interface RequestItem {
  product_name_snapshot: string;
  product_sku_snapshot?: string | null;
  quantity: number;
  unit_price?: number | null;
  line_total?: number | null;
}

interface RequestData {
  quote_number: string;
  created_at: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_company?: string | null;
  customer_tax_id?: string | null;
  shipping_address?: string | null;
  notes?: string | null;
  total?: number | null;
  shipping_total?: number | null;
}

const IVA = 0.23;
const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " €";

export function generateRequestPdf(request: RequestData, items: RequestItem[]) {
  const hoje = new Date(request.created_at).toLocaleDateString("pt-PT", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const subtotalCIva = items.reduce((s, it) => s + (it.line_total ?? (it.unit_price ?? 0) * it.quantity), 0);
  const subtotalSIva = subtotalCIva / (1 + IVA);
  const ivaValor     = subtotalCIva - subtotalSIva;
  const shipping     = Number(request.shipping_total) || 0;
  const totalFinal   = subtotalCIva + shipping;

  const itemsHTML = items.map((it, idx) => {
    const unitVat = it.unit_price ?? 0;
    const lineVat = it.line_total ?? (unitVat * it.quantity);
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    return `
      <tr style="background:${bg}">
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">
          <div style="font-weight:600;color:#0f172a;font-size:13px">${it.product_name_snapshot}</div>
          ${it.product_sku_snapshot ? `<div style="font-size:11px;color:#94a3b8;font-family:monospace;margin-top:2px">REF: ${it.product_sku_snapshot}</div>` : ""}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:13px">${it.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b;font-size:13px">${unitVat > 0 ? fmt(unitVat) : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;font-size:13px">${lineVat > 0 ? fmt(lineVat) : "—"}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8"/>
<title>Pedido ${request.quote_number}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Helvetica Neue',Arial,sans-serif; color:#0f172a; background:#fff; font-size:13px; }
  @page { margin:15mm 12mm; size:A4; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  .page { max-width:780px; margin:0 auto; }
  .header { background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%); color:#fff; padding:28px 32px; border-radius:0 0 12px 12px; display:flex; justify-content:space-between; align-items:flex-start; }
  .header .name { font-size:24px; font-weight:800; color:#ea580c; }
  .header .sub  { font-size:11px; color:#94a3b8; margin-top:2px; }
  .header .web  { font-size:11px; color:#64748b; margin-top:1px; }
  .header-doc { text-align:right; }
  .header-doc .doc-type { font-size:20px; font-weight:800; color:#fff; }
  .header-doc .doc-num  { font-size:14px; color:#ea580c; font-weight:700; margin-top:4px; font-family:monospace; }
  .header-doc .doc-date { font-size:11px; color:#94a3b8; margin-top:2px; }

  .warn { background:#fefce8; border:1px solid #fde047; border-radius:8px; padding:12px 16px; margin:20px 0; display:flex; gap:10px; align-items:flex-start; }
  .warn-icon { font-size:18px; flex-shrink:0; margin-top:-1px; }
  .warn-title { font-size:12px; font-weight:700; color:#854d0e; margin-bottom:2px; }
  .warn-text  { font-size:11px; color:#92400e; }

  .info-row { display:flex; gap:16px; margin:0 0 20px; }
  .info-box { flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; }
  .box-title { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }
  .box-name  { font-size:14px; font-weight:700; color:#0f172a; margin-bottom:3px; }
  .box-line  { font-size:12px; color:#64748b; margin-bottom:2px; }
  .det-row   { display:flex; justify-content:space-between; margin-bottom:5px; }
  .det-label { font-size:11px; color:#94a3b8; }
  .det-value { font-size:12px; font-weight:600; color:#0f172a; }

  .addr-box { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px; margin-bottom:16px; }
  .addr-title { font-size:10px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px; }
  .addr-text  { font-size:12px; color:#1e40af; }

  .table-wrap { border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; margin-bottom:20px; }
  table { width:100%; border-collapse:collapse; }
  thead tr { background:linear-gradient(135deg,#475569,#334155); }
  thead th { padding:10px 12px; color:#fff; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; text-align:left; }
  thead th:not(:first-child) { text-align:right; }
  thead th:nth-child(2) { text-align:center; }

  .totals-wrap { display:flex; justify-content:flex-end; margin-bottom:20px; }
  .totals-box { width:280px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; }
  .tot-row { display:flex; justify-content:space-between; margin-bottom:6px; }
  .tot-label { font-size:12px; color:#64748b; }
  .tot-value { font-size:12px; color:#0f172a; }
  .tot-div { border:none; border-top:2px dashed #e2e8f0; margin:10px 0; }
  .tot-total .tot-label { font-size:14px; font-weight:800; color:#64748b; }
  .tot-total .tot-value { font-size:14px; font-weight:800; color:#475569; }
  .tot-note { font-size:10px; color:#94a3b8; margin-top:6px; text-align:right; font-style:italic; }

  .notes-box { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px; margin-bottom:16px; }
  .notes-title { font-size:10px; font-weight:700; color:#166534; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:5px; }
  .notes-text  { font-size:12px; color:#15803d; }

  .footer { border-top:1px solid #e2e8f0; padding-top:12px; margin-top:8px; display:flex; justify-content:space-between; }
  .footer-left .co-name { font-size:12px; font-weight:700; color:#0f172a; }
  .footer-left .co-line { font-size:10px; color:#94a3b8; margin-top:1px; }
  .footer-right .disc { font-size:10px; color:#94a3b8; text-align:right; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="name">VRCF</div>
      <div class="sub">Informática &amp; Segurança</div>
      <div class="web">catalogo.vrcf.pt</div>
    </div>
    <div class="header-doc">
      <div class="doc-type">PEDIDO DE ORÇAMENTO</div>
      <div class="doc-num">${request.quote_number}</div>
      <div class="doc-date">${hoje}</div>
    </div>
  </div>

  <div class="warn">
    <div class="warn-icon">⚠️</div>
    <div>
      <div class="warn-title">Valores estimados com IVA incluído</div>
      <div class="warn-text">Este documento é uma cópia do pedido de orçamento. Os valores definitivos (preços, portes e prazo) serão confirmados no orçamento oficial enviado pela VRCF.</div>
    </div>
  </div>

  <div class="info-row">
    <div class="info-box" style="flex:2">
      <div class="box-title">Cliente</div>
      <div class="box-name">${request.customer_name || "—"}</div>
      ${request.customer_company ? `<div class="box-line">${request.customer_company}</div>` : ""}
      ${request.customer_tax_id ? `<div class="box-line" style="font-size:11px;color:#94a3b8">NIF: ${request.customer_tax_id}</div>` : ""}
      ${request.customer_phone ? `<div class="box-line">📞 ${request.customer_phone}</div>` : ""}
      ${request.customer_email ? `<div class="box-line">✉️ ${request.customer_email}</div>` : ""}
    </div>
    <div class="info-box" style="flex:1.2">
      <div class="box-title">Referência</div>
      <div class="det-row"><span class="det-label">Data</span><span class="det-value">${hoje}</span></div>
      <div class="det-row"><span class="det-label">Nº pedido</span><span class="det-value" style="font-family:monospace;color:#ea580c">${request.quote_number}</span></div>
    </div>
  </div>

  ${request.shipping_address ? `
  <div class="addr-box">
    <div class="addr-title">📦 Morada de Entrega</div>
    <div class="addr-text">${request.shipping_address}</div>
  </div>` : ""}

  <div class="table-wrap">
    <table>
      <thead><tr>
        <th style="width:55%">Produto / Referência</th>
        <th style="width:10%">Qtd</th>
        <th style="width:17%">Unit. c/ IVA</th>
        <th style="width:18%">Total c/ IVA</th>
      </tr></thead>
      <tbody>${itemsHTML}</tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="tot-row"><span class="tot-label">Subtotal s/ IVA</span><span class="tot-value">${fmt(subtotalSIva)}</span></div>
      <div class="tot-row"><span class="tot-label">IVA (23%)</span><span class="tot-value">${fmt(ivaValor)}</span></div>
      ${shipping > 0 ? `<div class="tot-row"><span class="tot-label">Portes estimados</span><span class="tot-value">${fmt(shipping)}</span></div>` : ""}
      <hr class="tot-div"/>
      <div class="tot-row tot-total">
        <span class="tot-label">Total estimado c/ IVA</span>
        <span class="tot-value">${fmt(totalFinal)}</span>
      </div>
      <div class="tot-note">* Valor sujeito a confirmação no orçamento oficial</div>
    </div>
  </div>

  ${request.notes ? `
  <div class="notes-box">
    <div class="notes-title">✏️ Observações</div>
    <div class="notes-text">${request.notes}</div>
  </div>` : ""}

  <div class="footer">
    <div class="footer-left">
      <div class="co-name">VRCF — Informática &amp; Segurança, Unipessoal Lda</div>
      <div class="co-line">NIF PT515237205 · Rua Luís Calado Nunes 15 LJ B, 2870-350 Montijo</div>
      <div class="co-line">📞 +351 911 564 243 · ✉️ geral@vrcf.pt · 🌐 catalogo.vrcf.pt</div>
    </div>
    <div class="footer-right">
      <div class="disc">Documento não substitui fatura fiscal</div>
      <div class="disc">Pedido submetido em ${hoje}</div>
    </div>
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) { alert("Ativa os popups para gerar o PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => { setTimeout(() => { win.print(); }, 300); };
}
