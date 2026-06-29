import jsPDF from "jspdf";

interface RequestItem {
  product_name_snapshot: string;
  product_sku_snapshot?: string | null;
  product_image_snapshot?: string | null;
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
}

const PRIMARY = [234, 88, 12] as const;
const DARK    = [15, 23, 42]  as const;
const GRAY    = [100, 100, 100] as const;
const LIGHT   = [241, 245, 249] as const;

const rgb = (doc: jsPDF, c: readonly [number, number, number]) =>
  doc.setTextColor(c[0], c[1], c[2]);

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
    doc.text("Este documento é um pedido de orçamento. Os preços finais serão confirmados no orçamento oficial.", CT, fy + 12, { align: "center" });
  };

  // Cabeçalho
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

  // Dados do cliente + ref
  const colW = (W - ML - MR - 8) / 2;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y, colW, 32, 2, 2, "F");
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
  doc.roundedRect(col2X, y, colW, 32, 2, 2, "F");
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
  if (request.shipping_address) detRow("Entrega:", request.shipping_address.substring(0, 30));

  y += 38;

  // Tabela
  doc.setFillColor(...PRIMARY);
  doc.rect(ML, y, W - ML - MR, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Produto / Referência", ML + 3, y + 5.5);
  doc.text("Qtd", W - MR - 10, y + 5.5, { align: "right" });
  y += 10;

  let rowEven = false;
  for (const it of items) {
    if (y > H - 50) { doc.addPage(); y = 20; drawFooter(); }
    const nameLines = doc.splitTextToSize(it.product_name_snapshot, W - ML - MR - 20);
    const rowH = Math.max(9, nameLines.length * 5 + (it.product_sku_snapshot ? 4 : 0));

    if (rowEven) { doc.setFillColor(248, 250, 252); doc.rect(ML, y, W - ML - MR, rowH, "F"); }
    rowEven = !rowEven;

    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
    doc.text(nameLines, ML + 3, y + 5);
    if (it.product_sku_snapshot) {
      rgb(doc, GRAY); doc.setFontSize(7.5);
      doc.text(`REF: ${it.product_sku_snapshot}`, ML + 3, y + 5 + nameLines.length * 4.5);
      doc.setFontSize(8.5);
    }
    rgb(doc, DARK); doc.setFont("helvetica", "bold");
    doc.text(String(it.quantity), W - MR - 2, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(220, 220, 220);
    doc.line(ML, y + rowH, W - MR, y + rowH);
    y += rowH + 1;
  }

  y += 6;
  // Aviso de preços
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(ML, y, W - ML - MR, 14, 2, 2, "F");
  doc.setFontSize(8); rgb(doc, [146, 64, 14]);
  doc.setFont("helvetica", "bold");
  doc.text("⚠  Pedido de orçamento — aguarda confirmação de preços", ML + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text("Os valores definitivos (preço, portes e prazo) serão confirmados no orçamento formal.", ML + 4, y + 11);
  y += 20;

  if (request.notes) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); rgb(doc, [90, 90, 90]);
    doc.text("OBSERVAÇÕES", ML, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
    const noteLines = doc.splitTextToSize(request.notes, W - ML - MR);
    doc.text(noteLines, ML, y);
  }

  if (request.shipping_address) {
    y += 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); rgb(doc, [90, 90, 90]);
    doc.text("MORADA DE ENTREGA", ML, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
    doc.text(request.shipping_address, ML, y);
  }

  drawFooter();
  doc.save(`Pedido_${request.quote_number}.pdf`);
}
