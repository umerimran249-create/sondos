import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateQuotePdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";

type Params = { id: string };

export async function POST(
  _req: Request,
  { params }: { params: Params }
) {
  const quoteId = params.id;

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select(
      "id, quote_id, total_amount, quote_date, customers(name, email)"
    )
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json(
      { error: quoteError?.message ?? "Quote not found" },
      { status: 404 }
    );
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("quote_items")
    .select("description, quantity, unit_price, line_total")
    .eq("quote_id", quoteId);

  if (itemsError) {
    return NextResponse.json(
      { error: itemsError.message },
      { status: 500 }
    );
  }

  const pdfBytes = generateQuotePdf({
    quote_id: quote.quote_id,
    customer_name: (quote.customers as any)?.name ?? "",
    quote_date: quote.quote_date ?? "",
    items: (items ?? []) as any,
    total_amount: quote.total_amount ?? 0,
  });

  const customerEmail = (quote.customers as any)?.email;
  if (!customerEmail) {
    return NextResponse.json(
      { error: "Customer email is missing" },
      { status: 400 }
    );
  }

  try {
    await sendEmail({
      to: customerEmail,
      subject: `Quote ${quote.quote_id} from Stone ERP`,
      text: "Please find your quote attached as a PDF.",
      attachments: [
        {
          filename: `Quote-${quote.quote_id}.pdf`,
          content: Buffer.from(pdfBytes),
        },
      ],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

