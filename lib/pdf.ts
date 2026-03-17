import jsPDF from "jspdf";

type QuoteItem = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type QuoteForPdf = {
  quote_id: string;
  customer_name: string;
  quote_date: string;
  items: QuoteItem[];
  total_amount: number;
};

export function generateQuotePdf(quote: QuoteForPdf): Uint8Array {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Stone ERP - Quote", 14, 20);

  doc.setFontSize(10);
  doc.text(`Quote #: ${quote.quote_id}`, 14, 30);
  doc.text(`Customer: ${quote.customer_name}`, 14, 36);
  doc.text(`Date: ${quote.quote_date}`, 14, 42);

  let y = 54;
  doc.setFontSize(10);
  doc.text("Description", 14, y);
  doc.text("Qty", 110, y);
  doc.text("Unit", 130, y);
  doc.text("Total", 160, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 4;

  quote.items.forEach((item) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(item.description, 14, y, { maxWidth: 90 });
    doc.text(String(item.quantity), 110, y);
    doc.text(`$${item.unit_price.toFixed(2)}`, 130, y, { align: "right" });
    doc.text(`$${item.line_total.toFixed(2)}`, 190, y, { align: "right" });
    y += 6;
  });

  y += 4;
  doc.line(120, y, 196, y);
  y += 6;
  doc.setFontSize(12);
  doc.text(`Total: $${quote.total_amount.toFixed(2)}`, 190, y, {
    align: "right",
  });

  return new Uint8Array(doc.output("arraybuffer") as unknown as ArrayBuffer);
}

