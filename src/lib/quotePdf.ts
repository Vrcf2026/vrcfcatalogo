import jsPDF from "jspdf";

interface QuoteItem {
  product_name_snapshot: string;
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

const IVA = 0.23;
const PRIMARY = [234, 88, 12] as const;   // laranja VRCF
const DARK    = [15, 23, 42]  as const;
const GRAY    = [100, 100, 100] as const;
const LIGHT   = [241, 245, 249] as const;

const fmt = (n: number | null | undefined) =>
  n != null ? Number(n).toFixed(2).replace(".", ",") + " €" : "—";

const rgb = (doc: jsPDF, color: readonly [number, number, number]) =>
  doc.setTextColor(color[0], color[1], color[2]);

export function generateQuotePdf(quote: QuoteData, items: QuoteItem[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ML = 15, MR = 15, CT = W / 2;
  let y = 15;

  const addPage = () => { doc.addPage(); y = 20; drawFooter(); };

  const drawFooter = () => {
    const fy = H - 18;
    doc.setDrawColor(220, 220, 220);
    doc.line(ML, fy, W - MR, fy);
    doc.setFontSize(7); rgb(doc, GRAY);
    doc.text("VRCF — Informática & Segurança · Rua Luís Calado Nunes 15 LJ B · 2870-350 Montijo · NIF PT515237205", CT, fy + 4, { align: "center" });
    doc.text("geral@vrcf.pt · +351 911 564 243 · catalogo.vrcf.pt", CT, fy + 8, { align: "center" });
    doc.text("Preços c/ IVA à taxa legal em vigor. Documento não substitui fatura.", CT, fy + 12, { align: "center" });
  };

  // ── CABEÇALHO ──────────────────────────────────────────────────────────────
  // Fundo laranja no topo
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 28, "F");

  // Nome empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("VRCF", ML, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 220, 190);
  doc.text("Informática & Segurança", ML, 17);
  doc.text("catalogo.vrcf.pt", ML, 21);

  // Título ORÇAMENTO (lado direito)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("ORÇAMENTO", W - MR, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 220, 190);
  doc.text(quote.quote_number, W - MR, 19, { align: "right" });
  doc.text(new Date(quote.created_at).toLocaleDateString("pt-PT"), W - MR, 24, { align: "right" });

  y = 36;

  // ── DOIS BLOCOS: CLIENTE + DETALHES ────────────────────────────────────────
  const colW = (W - ML - MR - 8) / 2;

  // Bloco cliente
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y, colW, 38, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); rgb(doc, [90, 90, 90]);
  doc.text("CLIENTE", ML + 4, y + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); rgb(doc, DARK);
  let cy = y + 12;
  if (quote.customer_name) { doc.setFont("helvetica", "bold"); doc.text(quote.customer_name, ML + 4, cy); cy += 5; doc.setFont("helvetica", "normal"); }
  if (quote.customer_company) { doc.text(quote.customer_company, ML + 4, cy); cy += 4; }
  if (quote.customer_tax_id) { rgb(doc, GRAY); doc.setFontSize(8); doc.text(`NIF: ${quote.customer_tax_id}`, ML + 4, cy); cy += 4; rgb(doc, DARK); doc.setFontSize(9); }
  if (quote.customer_email) { doc.text(quote.customer_email, ML + 4, cy); cy += 4; }
  if (quote.customer_phone) { doc.text(quote.customer_phone, ML + 4, cy); }

  // Bloco detalhes
  const col2X = ML + colW + 8;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(col2X, y, colW, 38, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); rgb(doc, [90, 90, 90]);
  doc.text("DETALHES", col2X + 4, y + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); rgb(doc, DARK);
  let dy = y + 12;
  const detRow = (label: string, val: string) => {
    rgb(doc, GRAY); doc.setFontSize(8); doc.text(label, col2X + 4, dy);
    rgb(doc, DARK); doc.setFontSize(9); doc.text(val, col2X + colW - 4, dy, { align: "right" }); dy += 5;
  };
  detRow("Data:", new Date(quote.created_at).toLocaleDateString("pt-PT"));
  detRow("Validade:", quote.validade ?? "30 dias");
  if (quote.prazo_entrega) detRow("Prazo entrega:", quote.prazo_entrega);
  detRow("Referência:", quote.quote_number);

  y += 44;

  // ── MORADA DE ENVIO ────────────────────────────────────────────────────────
  if (quote.shipping_address) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); rgb(doc, [90, 90, 90]);
    doc.text("MORADA DE ENTREGA", ML, y);
    y += 4;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); rgb(doc, DARK);
    doc.text(quote.shipping_address, ML, y);
    y += 8;
  }

  // ── TABELA DE PRODUTOS ─────────────────────────────────────────────────────
  // Cabeçalho tabela
  doc.setFillColor(...PRIMARY);
  doc.rect(ML, y, W - ML - MR, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Descrição", ML + 3, y + 5.5);
  doc.text("Qtd", W - MR - 55, y + 5.5, { align: "right" });
  doc.text("Unit. c/IVA", W - MR - 28, y + 5.5, { align: "right" });
  doc.text("Total", W - MR - 2, y + 5.5, { align: "right" });
  y += 10;

  // Linhas
  let rowEven = false;
  for (const it of items) {
    if (y > H - 55) addPage();
    const nameLines = doc.splitTextToSize(it.product_name_snapshot, W - ML - MR - 65);
    const rowH = Math.max(8, nameLines.length * 5);

    if (rowEven) { doc.setFillColor(248, 250, 252); doc.rect(ML, y, W - ML - MR, rowH, "F"); }
    rowEven = !rowEven;

    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
    doc.text(nameLines, ML + 3, y + 5);
    rgb(doc, GRAY);
    doc.text(String(it.quantity), W - MR - 55, y + 5, { align: "right" });
    doc.text(fmt(it.unit_price), W - MR - 28, y + 5, { align: "right" });
    rgb(doc, DARK); doc.setFont("helvetica", "bold");
    doc.text(fmt(it.line_total), W - MR - 2, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");

    doc.setDrawColor(220, 220, 220);
    doc.line(ML, y + rowH, W - MR, y + rowH);
    y += rowH + 1;
  }

  // ── TOTAIS ─────────────────────────────────────────────────────────────────
  y += 4;
  const totalComIva = Number(quote.total) || 0;
  const shipping = Number(quote.shipping_total) || 0;
  const prodTotal = totalComIva - shipping;
  const subtotalSIva = totalComIva / (1 + IVA);
  const ivaValor = totalComIva - subtotalSIva;

  const totRow = (label: string, val: string, bold = false) => {
    if (y > H - 50) addPage();
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    rgb(doc, bold ? DARK : GRAY);
    doc.text(label, W - MR - 55, y);
    rgb(doc, DARK);
    doc.text(val, W - MR - 2, y, { align: "right" });
    y += bold ? 7 : 5;
  };

  totRow("Subtotal s/ IVA", fmt(subtotalSIva));
  totRow(`IVA (23%)`, fmt(ivaValor));
  if (shipping > 0) totRow("Portes", fmt(shipping));
  doc.setDrawColor(...PRIMARY); doc.line(W - MR - 60, y - 1, W - MR, y - 1);
  totRow("TOTAL C/ IVA", fmt(totalComIva), true);

  // ── FORMAS DE PAGAMENTO ────────────────────────────────────────────────────
  y += 6;
  if (y > H - 65) addPage();
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y, W - ML - MR, 36, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); rgb(doc, [90, 90, 90]);
  doc.text("FORMAS DE PAGAMENTO", ML + 4, y + 6);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
  const payments = [
    "● Transferência bancária — IBAN: PT50 0010 0000 5754 9020 0011 5 (Banco BPI, S.A.)",
    "● MB Way — +351 911 564 243",
    "● Numerário (pagamento em loja)",
    "● Cheque à ordem de VRCF — Informática & Segurança",
  ];
  let py = y + 12;
  for (const p of payments) { doc.text(p, ML + 4, py); py += 5; }
  y += 42;

  // ── OBSERVAÇÕES ────────────────────────────────────────────────────────────
  if (quote.notes) {
    if (y > H - 50) addPage();
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); rgb(doc, [90, 90, 90]);
    doc.text("OBSERVAÇÕES", ML, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); rgb(doc, DARK);
    const noteLines = doc.splitTextToSize(quote.notes, W - ML - MR);
    doc.text(noteLines, ML, y);
    y += noteLines.length * 4.5 + 4;
  }

  // ── CONDIÇÕES GERAIS ───────────────────────────────────────────────────────
  if (y > H - 50) addPage();
  y += 2;
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); rgb(doc, GRAY);
  const conds = [
    "Este orçamento tem validade de " + (quote.validade ?? "30 dias") + " a partir da data de emissão.",
    "Os preços apresentados incluem IVA à taxa legal em vigor e são meramente indicativos.",
    "A encomenda só é processada após confirmação de pagamento ou acordo de condições.",
    "Imagens meramente ilustrativas. Especificações técnicas sujeitas a alteração pelo fabricante.",
  ];
  for (const c of conds) { doc.text("• " + c, ML, y); y += 4; }

  drawFooter();
  doc.save(`Orcamento_${quote.quote_number}.pdf`);
}