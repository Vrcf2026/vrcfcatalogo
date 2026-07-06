import jsPDF from "jspdf";

interface RequestItem {
  product_name_snapshot: string;
  product_sku_snapshot?: string | null;
  product_image_snapshot?: string | null;
  quantity: number;
  unit_price?: number | null;  // c/IVA
  line_total?: number | null;  // c/IVA
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

const PRIMARY = [234, 88, 12] as const;
const DARK    = [15, 23, 42]  as const;
const GRAY    = [100, 100, 100] as const;
const LIGHT   = [241, 245, 249] as const;
const WARN    = [255, 249, 235] as const;

const IVA = 0.23;
const rgb = (doc: jsPDF, c: readonly [number, number, number]) =>
  doc.setTextColor(c[0], c[1], c[2]);
const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " €";

export function generateRequestPdf(request: RequestData, items: RequestItem[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 15, MR = 15, CT = W / 2;
  let y = 15;

  const drawFooter = () => {
    const fy = H - 18;
    doc.setDrawColor(220, 220, 220);
    doc.line(ML, fy, W - MR, fy);
    doc.setFontSize(7); rgb(doc, GRAY);
    doc.text("VRCF — Informática & Segurança · Rua Luís Calado Nunes 15 LJ B · 2870-350 Montijo · NIF PT515237205", CT, fy + 4, { align: "center" });
    doc.text("geral@vrcf.pt · +351 911 564 243 · catalogo.vrcf.pt", CT, fy + 8, { align: "center" });
    doc.text("Valores estimados c/IVA. O orçamento definitivo será confirmado em separado.", CT, fy + 12, { align: "center" });
  };

  // ── CABEÇALHO ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 28, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("VRCF", ML, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(255, 220, 190);
  doc.text("Informática & Segurança", ML, 17);
  doc.text("catalogo.vrcf.pt", ML, 21);

  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("PEDIDO DE ORÇAMENTO", W - MR, 13, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.setTextColor(255, 220, 190);
  doc.text(request.quote_number, W - MR, 19, { align: "right" });
  doc.text(new Date(request.created_at).toLocaleDateString("pt-PT"), W - MR, 24, { align: "right" });

  y = 36;

  // ── AVISO ──
  doc.setFillColor(...WARN);
  doc.roundedRect(ML, y, W - ML - MR, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(146, 64, 14);
  doc.text("⚠  Pedido de orçamento — valores estimados c/ IVA", ML + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text("O orçamento definitivo (com preços, portes e prazo confirmados) será enviado em separado.", ML + 4, y + 10);
  y += 17;

  // ── DOIS BLOCOS: CLIENTE + DETALHES ──
  const colW = (W - ML - MR - 8) / 2;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y, colW, 36, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); rgb(doc, [90, 90, 90]);
  doc.text("CLIENTE", ML + 4, y + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); rgb(doc, DARK);
  let cy = y + 12;
  if (request.customer_name) { doc.setFont("helvetica", "bold"); doc.text(request.customer_name, ML + 4, cy); cy += 5; doc.setFont("helvetica", "normal"); }
  if (request.customer_company) { doc.text(request.customer_company, ML + 4, cy); cy += 4; }
  if (request.customer_tax_id) { rgb(doc, GRAY); doc.setFontSize(8); doc.text(`NIF: ${request.customer_tax_id}`, ML + 4, cy); cy += 4; rgb(doc, DARK); doc.setFontSize(9); }
  if (request.customer_email) { doc.text(request.customer_email, ML + 4, cy); cy += 4; }
  if (request.customer_phone) { doc.text(request.customer_phone, ML + 4, cy); }

  const col2X = ML + colW + 8;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(col2X, y, colW, 36, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); rgb(doc, [90, 90, 90]);
  doc.text("REFERÊNCIA", col2X + 4, y + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); rgb(doc, DARK);
  let dy = y + 12;
  const detRow = (label: string, val: string) => {
    rgb(doc, GRAY); doc.setFontSize(8); doc.text(label, col2X + 4, dy);
    rgb(doc, DARK); doc.setFontSize(9); doc.text(val, col2X + colW - 4, dy, { align: "right" }); dy += 5;
  };
  detRow("Data:", new Date(request.created_at).toLocaleDateString("pt-PT"));
  detRow("Nº pedido:", request.quote_number);
  if (request.shipping_address) {
    const addr = request.shipping_address.substring(0, 32);
    detRow("Entrega:", addr);
  }
  y += 41;

  // ── TABELA DE PRODUTOS ──
  doc.setFillColor(...PRIMARY);
  doc.rect(ML, y, W - ML - MR, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Produto / Referência", ML + 3, y + 5.5);
  doc.text("Qtd", W - MR - 55, y + 5.5, { align: "right" });
  doc.text("Unit. c/IVA", W - MR - 28, y + 5.5, { align: "right" });
  doc.text("Total c/IVA", W - MR - 2, y + 5.5, { align: "right" });
  y += 10;

  let subtotalCIva = 0;
  let rowEven = false;
  for (const it of items) {
    if (y > H - 60) { doc.addPage(); y = 20; drawFooter(); }
    const unitVat = it.unit_price ?? 0; // já c/IVA
    const lineVat = it.line_total ?? (unitVat * it.quantity);
    subtotalCIva += lineVat;

    const nameLines = doc.splitTextToSize(it.product_name_snapshot, W - ML - MR - 68);
    const hasRef = !!it.product_sku_snapshot;
    const rowH = Math.max(9, nameLines.length * 4.8 + (hasRef ? 4 : 0));

    if (rowEven) { doc.setFillColor(248, 250, 252); doc.rect(ML, y, W - ML - MR, rowH, "F"); }
    rowEven = !rowEven;

    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
    doc.text(nameLines, ML + 3, y + 5);
    if (hasRef) {
      rgb(doc, GRAY); doc.setFontSize(7.5);
      doc.text(`REF: ${it.product_sku_snapshot}`, ML + 3, y + 5 + nameLines.length * 4.5);
      doc.setFontSize(8.5);
    }

    rgb(doc, GRAY);
    doc.text(String(it.quantity), W - MR - 55, y + 5, { align: "right" });
    doc.text(unitVat > 0 ? fmt(unitVat) : "—", W - MR - 28, y + 5, { align: "right" });
    rgb(doc, DARK); doc.setFont("helvetica", "bold");
    doc.text(lineVat > 0 ? fmt(lineVat) : "—", W - MR - 2, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");

    doc.setDrawColor(220, 220, 220);
    doc.line(ML, y + rowH, W - MR, y + rowH);
    y += rowH + 1;
  }

  // ── TOTAIS ──
  y += 5;
  const shipping = Number(request.shipping_total) || 0;
  const subtotalSIva = subtotalCIva / (1 + IVA);
  const ivaValor = subtotalCIva - subtotalSIva;
  const totalFinal = subtotalCIva + shipping;

  const totRow = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    rgb(doc, bold ? DARK : GRAY);
    doc.text(label, W - MR - 68, y);
    rgb(doc, DARK);
    doc.text(val, W - MR - 2, y, { align: "right" });
    y += bold ? 7 : 5;
  };
  totRow("Subtotal s/ IVA (estimado)", fmt(subtotalSIva));
  totRow("IVA 23% (estimado)", fmt(ivaValor));
  if (shipping > 0) totRow("Portes estimados c/ IVA", fmt(shipping));
  doc.setDrawColor(...PRIMARY); doc.line(W - MR - 70, y - 1, W - MR, y - 1);
  totRow("TOTAL ESTIMADO c/ IVA", fmt(totalFinal), true);

  // ── MORADA ──
  if (request.shipping_address) {
    y += 6;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); rgb(doc, [90, 90, 90]);
    doc.text("MORADA DE ENTREGA", ML, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
    doc.text(request.shipping_address, ML, y); y += 6;
  }

  // ── OBSERVAÇÕES ──
  if (request.notes) {
    if (y > H - 50) { doc.addPage(); y = 20; drawFooter(); }
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); rgb(doc, [90, 90, 90]);
    doc.text("OBSERVAÇÕES", ML, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
    const noteLines = doc.splitTextToSize(request.notes, W - ML - MR);
    doc.text(noteLines, ML, y);
  }

  drawFooter();
  doc.save(`Pedido_${request.quote_number}.pdf`);
}
