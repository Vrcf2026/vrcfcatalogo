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
  notes?: string | null;
  total?: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", sent: "Enviado", in_review: "Em análise",
  accepted: "Aceite", rejected: "Rejeitado", cancelled: "Cancelado", completed: "Concluído",
};

const fmt = (n: number | null | undefined) =>
  n != null ? Number(n).toFixed(2).replace(".", ",") + " €" : "—";

export function generateQuotePdf(quote: QuoteData, items: QuoteItem[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 20;

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("VRCF — Informática & Segurança", 15, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Rua Luis Calado Nunes 15 LJ B · 2870-350 Montijo · NIF PT515237205", 15, y);
  y += 4;
  doc.text("geral@vrcf.pt · +351 911 564 243 · showroom.vrcf.info", 15, y);

  // Linha
  y += 6;
  doc.setDrawColor(220);
  doc.line(15, y, pageW - 15, y);
  y += 8;

  // Título orçamento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Orçamento ${quote.quote_number}`, 15, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(new Date(quote.created_at).toLocaleString("pt-PT"), pageW - 15, y, { align: "right" });
  y += 6;
  if (quote.status) {
    doc.setTextColor(234, 88, 12);
    doc.text(`Estado: ${STATUS_LABEL[quote.status] ?? quote.status}`, 15, y);
    y += 6;
  }

  // Cliente
  if (quote.customer_name || quote.customer_email) {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Cliente", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (quote.customer_name) { doc.text(quote.customer_name, 15, y); y += 4; }
    if (quote.customer_email) { doc.text(quote.customer_email, 15, y); y += 4; }
    if (quote.customer_phone) { doc.text(quote.customer_phone, 15, y); y += 4; }
    y += 3;
  }

  // Tabela de itens
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageW - 30, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Produto", 17, y + 5);
  doc.text("Qtd", pageW - 65, y + 5, { align: "right" });
  doc.text("Unit.", pageW - 45, y + 5, { align: "right" });
  doc.text("Total", pageW - 17, y + 5, { align: "right" });
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const it of items) {
    if (y > pageH - 40) {
      doc.addPage();
      y = 20;
    }
    const nameLines = doc.splitTextToSize(it.product_name_snapshot, pageW - 90);
    doc.setTextColor(15, 23, 42);
    doc.text(nameLines, 17, y);
    doc.setTextColor(60);
    doc.text(String(it.quantity), pageW - 65, y, { align: "right" });
    doc.text(fmt(it.unit_price), pageW - 45, y, { align: "right" });
    doc.text(fmt(it.line_total), pageW - 17, y, { align: "right" });
    y += Math.max(5, nameLines.length * 4);
    doc.setDrawColor(240);
    doc.line(15, y, pageW - 15, y);
    y += 3;
  }

  // Total
  if (quote.total != null && Number(quote.total) > 0) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Total", pageW - 50, y, { align: "right" });
    doc.text(fmt(quote.total), pageW - 17, y, { align: "right" });
    y += 6;
  }

  // Notas
  if (quote.notes) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Observações", 15, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(quote.notes, pageW - 30);
    doc.text(noteLines, 15, y);
    y += noteLines.length * 4;
  }

  // Rodapé legal
  const footerY = pageH - 12;
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text("Preços indicativos. IVA incluído à taxa legal em vigor. Imagens meramente ilustrativas.", pageW / 2, footerY, { align: "center" });
  doc.text("Documento gerado pelo Showroom VRCF — não substitui factura.", pageW / 2, footerY + 4, { align: "center" });

  doc.save(`Orcamento_${quote.quote_number}.pdf`);
}
