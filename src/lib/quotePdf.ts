/**
 * PDF do Orçamento — gerado via HTML impresso numa janela popup.
 * Muito mais rico visualmente que jsPDF.
 */

interface QuoteItem {
  product_name_snapshot: string;
  product_sku_snapshot?: string | null;
  product_image_snapshot?: string | null;
  quantity: number;
  unit_price?: number | null;
  line_total?: number | null;
}

interface QuoteData {
  quote_number: string;
  created_at: string;
  status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_company?: string | null;
  customer_tax_id?: string | null;
  shipping_address?: string | null;
  notes?: string | null;
  total?: number | null;
  shipping_total?: number | null;
  prazo_entrega?: string | null;
  validade?: string | null;
}

const fmt = (n: number | null | undefined) =>
  n != null ? Number(n).toFixed(2).replace(".", ",") + " €" : "—";

const esc = (v: unknown): string => {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const IVA = 0.23;

export function generateQuotePdf(quote: QuoteData, items: QuoteItem[]) {
  const totalComIva = Number(quote.total) || 0;
  const shipping    = Number(quote.shipping_total) || 0;
  const prodTotal   = totalComIva - shipping;
  const subtotalSIva = totalComIva / (1 + IVA);
  const ivaValor     = totalComIva - subtotalSIva;

  const hoje = new Date(quote.created_at).toLocaleDateString("pt-PT", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const itemsHTML = items.map((it, idx) => {
    const unitVat  = it.unit_price ?? 0;
    const lineVat  = it.line_total ?? unitVat * it.quantity;
    const bg       = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    return `
      <tr style="background:${bg}">
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">
          <div style="font-weight:600;color:#0f172a;font-size:13px">${esc(it.product_name_snapshot)}</div>
          ${it.product_sku_snapshot ? `<div style="font-size:11px;color:#94a3b8;font-family:monospace;margin-top:2px">REF: ${esc(it.product_sku_snapshot)}</div>` : ""}
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
<title>Orçamento ${esc(quote.quote_number)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color:#0f172a; background:#fff; font-size:13px; }
  @page { margin: 15mm 12mm; size: A4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  .page { max-width:780px; margin:0 auto; padding:0; }

  /* Cabeçalho */
  .header { background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%); color:#fff; padding:28px 32px; border-radius:0 0 12px 12px; display:flex; justify-content:space-between; align-items:flex-start; }
  .header-brand { }
  .header-brand .name { font-size:24px; font-weight:800; color:#ea580c; letter-spacing:-0.5px; }
  .header-brand .sub  { font-size:11px; color:#94a3b8; margin-top:2px; }
  .header-brand .web  { font-size:11px; color:#64748b; margin-top:1px; }
  .header-doc { text-align:right; }
  .header-doc .doc-type { font-size:22px; font-weight:800; color:#fff; letter-spacing:-0.5px; }
  .header-doc .doc-num  { font-size:14px; color:#ea580c; font-weight:700; margin-top:4px; font-family:monospace; }
  .header-doc .doc-date { font-size:11px; color:#94a3b8; margin-top:2px; }

  /* Blocos info */
  .info-row { display:flex; gap:16px; margin:20px 0; }
  .info-box { flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; }
  .info-box .box-title { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; }
  .info-box .box-name  { font-size:14px; font-weight:700; color:#0f172a; margin-bottom:4px; }
  .info-box .box-line  { font-size:12px; color:#64748b; margin-bottom:2px; }
  .info-box .box-nif   { font-size:11px; color:#94a3b8; }

  /* Detalhes do orçamento */
  .detail-row { display:flex; justify-content:space-between; margin-bottom:5px; }
  .detail-label { font-size:11px; color:#94a3b8; }
  .detail-value { font-size:12px; color:#0f172a; font-weight:600; }

  /* Tabela */
  .table-wrap { margin:0 0 20px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
  table { width:100%; border-collapse:collapse; }
  thead tr { background:linear-gradient(135deg,#ea580c,#c2410c); }
  thead th { padding:10px 12px; text-align:left; color:#fff; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
  thead th:not(:first-child) { text-align:right; }
  thead th:nth-child(2) { text-align:center; }

  /* Totais */
  .totals-wrap { display:flex; justify-content:flex-end; margin-bottom:20px; }
  .totals-box { width:280px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; }
  .tot-row { display:flex; justify-content:space-between; margin-bottom:6px; }
  .tot-label { font-size:12px; color:#64748b; }
  .tot-value { font-size:12px; color:#0f172a; }
  .tot-divider { border:none; border-top:2px solid #ea580c; margin:10px 0; }
  .tot-total .tot-label { font-size:15px; font-weight:800; color:#0f172a; }
  .tot-total .tot-value { font-size:15px; font-weight:800; color:#ea580c; }

  /* Pagamento */
  .payment-box { background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:16px; margin-bottom:20px; }
  .payment-box .pay-title { font-size:11px; font-weight:700; color:#c2410c; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; }
  .payment-box .pay-line  { font-size:12px; color:#92400e; margin-bottom:4px; display:flex; align-items:center; gap:6px; }

  /* Notas */
  .notes-box { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px; margin-bottom:16px; }
  .notes-box .notes-title { font-size:10px; font-weight:700; color:#166534; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px; }
  .notes-box .notes-text  { font-size:12px; color:#15803d; line-height:1.5; }

  /* Condições */
  .conditions { background:#f8fafc; border-radius:8px; padding:14px; margin-bottom:16px; }
  .conditions .cond-title { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }
  .conditions .cond-item  { font-size:11px; color:#64748b; margin-bottom:3px; display:flex; gap:6px; }

  /* Rodapé */
  .footer { border-top:1px solid #e2e8f0; padding-top:12px; margin-top:8px; display:flex; justify-content:space-between; align-items:flex-end; }
  .footer-left .co-name  { font-size:12px; font-weight:700; color:#0f172a; }
  .footer-left .co-line  { font-size:10px; color:#94a3b8; margin-top:1px; }
  .footer-right { text-align:right; }
  .footer-right .page-info { font-size:10px; color:#cbd5e1; }
  .footer-right .disclaimer { font-size:10px; color:#94a3b8; margin-top:2px; }

  /* Morada */
  .addr-box { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px; margin-bottom:16px; }
  .addr-box .addr-title { font-size:10px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:5px; }
  .addr-box .addr-text  { font-size:12px; color:#1e40af; }
</style>
</head>
<body>
<div class="page">

  <!-- Cabeçalho -->
  <div class="header">
    <div class="header-brand">
      <div class="name">VRCF</div>
      <div class="sub">Informática &amp; Segurança</div>
      <div class="web">catalogo.vrcf.pt</div>
    </div>
    <div class="header-doc">
      <div class="doc-type">ORÇAMENTO</div>
      <div class="doc-num">${quote.quote_number}</div>
      <div class="doc-date">${hoje}</div>
    </div>
  </div>

  <!-- Info cliente + detalhes -->
  <div class="info-row">
    <div class="info-box" style="flex:2">
      <div class="box-title">Cliente</div>
      <div class="box-name">${quote.customer_name || "—"}</div>
      ${quote.customer_company ? `<div class="box-line">${quote.customer_company}</div>` : ""}
      ${quote.customer_tax_id ? `<div class="box-nif">NIF: ${quote.customer_tax_id}</div>` : ""}
      ${quote.customer_phone ? `<div class="box-line">📞 ${quote.customer_phone}</div>` : ""}
      ${quote.customer_email ? `<div class="box-line">✉️ ${quote.customer_email}</div>` : ""}
    </div>
    <div class="info-box" style="flex:1.2">
      <div class="box-title">Detalhes</div>
      <div class="detail-row"><span class="detail-label">Data</span><span class="detail-value">${hoje}</span></div>
      <div class="detail-row"><span class="detail-label">Validade</span><span class="detail-value">${quote.validade ?? "30 dias"}</span></div>
      ${quote.prazo_entrega ? `<div class="detail-row"><span class="detail-label">Prazo</span><span class="detail-value">${quote.prazo_entrega}</span></div>` : ""}
      <div class="detail-row"><span class="detail-label">Referência</span><span class="detail-value" style="font-family:monospace;color:#ea580c">${quote.quote_number}</span></div>
    </div>
  </div>

  ${quote.shipping_address ? `
  <div class="addr-box">
    <div class="addr-title">📦 Morada de Entrega</div>
    <div class="addr-text">${quote.shipping_address}</div>
  </div>` : ""}

  <!-- Tabela de produtos -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:55%">Produto / Referência</th>
          <th style="width:10%">Qtd</th>
          <th style="width:17%">Unit. c/ IVA</th>
          <th style="width:18%">Total c/ IVA</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
  </div>

  <!-- Totais -->
  <div class="totals-wrap">
    <div class="totals-box">
      <div class="tot-row">
        <span class="tot-label">Subtotal s/ IVA</span>
        <span class="tot-value">${fmt(subtotalSIva)}</span>
      </div>
      <div class="tot-row">
        <span class="tot-label">IVA (23%)</span>
        <span class="tot-value">${fmt(ivaValor)}</span>
      </div>
      ${shipping > 0 ? `
      <div class="tot-row">
        <span class="tot-label">Portes c/ IVA</span>
        <span class="tot-value">${fmt(shipping)}</span>
      </div>` : ""}
      <hr class="tot-divider"/>
      <div class="tot-row tot-total">
        <span class="tot-label">TOTAL c/ IVA</span>
        <span class="tot-value">${fmt(totalComIva)}</span>
      </div>
    </div>
  </div>

  <!-- Formas de pagamento -->
  <div class="payment-box">
    <div class="pay-title">💳 Formas de Pagamento</div>
    <div class="pay-line">🏦 Transferência bancária — IBAN: PT50 0010 0000 5754 9020 0011 5 (Banco BPI)</div>
    <div class="pay-line">📱 MB Way — +351 911 564 243</div>
    <div class="pay-line">🏪 Numerário (pagamento em loja)</div>
    <div class="pay-line">✉️ Cheque à ordem de VRCF — Informática &amp; Segurança</div>
  </div>

  ${quote.notes ? `
  <div class="notes-box">
    <div class="notes-title">✏️ Observações</div>
    <div class="notes-text">${quote.notes}</div>
  </div>` : ""}

  <!-- Condições gerais -->
  <div class="conditions">
    <div class="cond-title">Condições Gerais</div>
    <div class="cond-item"><span>•</span><span>Este orçamento tem validade de <strong>${quote.validade ?? "30 dias"}</strong> a partir da data de emissão.</span></div>
    <div class="cond-item"><span>•</span><span>Os preços apresentados incluem IVA à taxa de 23% e são válidos até à data de validade indicada.</span></div>
    <div class="cond-item"><span>•</span><span>A encomenda só é processada após confirmação de pagamento ou acordo de condições de crédito.</span></div>
    <div class="cond-item"><span>•</span><span>Imagens meramente ilustrativas. Especificações técnicas sujeitas a alteração pelo fabricante.</span></div>
    <div class="cond-item"><span>•</span><span>Os portes de envio são calculados com base no peso e destino, podendo sofrer ajustes.</span></div>
  </div>

  <!-- Rodapé -->
  <div class="footer">
    <div class="footer-left">
      <div class="co-name">VRCF — Informática &amp; Segurança, Unipessoal Lda</div>
      <div class="co-line">NIF PT515237205 · Rua Luís Calado Nunes 15 LJ B, 2870-350 Montijo</div>
      <div class="co-line">📞 +351 911 564 243 · ✉️ geral@vrcf.pt · 🌐 catalogo.vrcf.pt</div>
    </div>
    <div class="footer-right">
      <div class="disclaimer">Documento não substitui fatura fiscal</div>
    </div>
  </div>

</div>
</body>
</html>`;

  // Abrir numa janela e imprimir
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) { alert("Ativa os popups para gerar o PDF."); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    setTimeout(() => {
      win.print();
    }, 300);
  };
}
