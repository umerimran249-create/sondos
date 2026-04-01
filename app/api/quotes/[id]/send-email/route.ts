import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { randomUUID } from "crypto";

type Params = { id: string };

function buildQuoteHtml(q: {
  quote_id: string;
  customer_name: string;
  quote_date: string;
  payment_type: string | null;
  notes: string | null;
  items: { description: string; quantity: number; unit_price: number; line_total: number }[];
  total_amount: number;
  accept_url: string;
  reject_url: string;
  has_drawing: boolean;
}) {
  const paymentLabel =
    q.payment_type === "cod"   ? "COD — Cash on Delivery"
    : q.payment_type === "net30" ? "Net 30"
    : q.payment_type === "net15" ? "Net 15"
    : "Pre-Paid";

  const rows = q.items.map((item) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #2a2a2a;color:#e5e7eb;">${item.description}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #2a2a2a;color:#e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #2a2a2a;color:#e5e7eb;text-align:right;">$${(item.unit_price ?? 0).toFixed(2)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #2a2a2a;color:#D4AF37;font-weight:700;text-align:right;">$${(item.line_total ?? 0).toFixed(2)}</td>
    </tr>`).join("");

  const drawingSection = q.has_drawing ? `
        <!-- Drawing -->
        <tr>
          <td style="padding:0 32px 24px;">
            <h3 style="color:#D4AF37;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:0 0 12px;">Layout Drawing</h3>
            <div style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;background:#0a1221;text-align:center;padding:8px;">
              <img src="cid:drawing@sondosstone" alt="Countertop Layout Drawing" style="max-width:100%;height:auto;border-radius:6px;display:block;margin:0 auto;" />
            </div>
          </td>
        </tr>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0d11;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0d11;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#13151a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#D4AF37,#A88B20);padding:28px 32px;">
            <h1 style="margin:0;color:#0b0d11;font-size:22px;font-weight:800;letter-spacing:-0.5px;">SondosStone</h1>
            <p style="margin:4px 0 0;color:#0b0d11;font-size:13px;opacity:0.75;">Countertop Fabrication · ERP System</p>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:28px 32px 0;">
            <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Quotation ${q.quote_id}</h2>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Dear ${q.customer_name}, please find your quotation details below.</p>
          </td>
        </tr>

        <!-- Meta -->
        <tr>
          <td style="padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:0 8px 0 0;">
                  <div style="background:#1c1f26;border-radius:10px;padding:14px 16px;">
                    <div style="color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Quote Date</div>
                    <div style="color:#fff;font-size:14px;font-weight:600;">${q.quote_date}</div>
                  </div>
                </td>
                <td width="50%" style="padding:0 0 0 8px;">
                  <div style="background:#1c1f26;border-radius:10px;padding:14px 16px;">
                    <div style="color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Payment Terms</div>
                    <div style="color:#D4AF37;font-size:14px;font-weight:700;">${paymentLabel}</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${drawingSection}

        <!-- Line Items -->
        <tr>
          <td style="padding:0 32px 8px;">
            <h3 style="color:#D4AF37;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:0 0 12px;">Line Items</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:#1c1f26;">
                  <th style="padding:10px 14px;color:#9ca3af;font-size:11px;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:.5px;">Description</th>
                  <th style="padding:10px 14px;color:#9ca3af;font-size:11px;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:.5px;">Qty</th>
                  <th style="padding:10px 14px;color:#9ca3af;font-size:11px;font-weight:600;text-align:right;text-transform:uppercase;letter-spacing:.5px;">Unit Price</th>
                  <th style="padding:10px 14px;color:#9ca3af;font-size:11px;font-weight:600;text-align:right;text-transform:uppercase;letter-spacing:.5px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="4" style="padding:20px;text-align:center;color:#6b7280;font-size:13px;">No line items</td></tr>`}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="right">
                  <div style="display:inline-block;background:linear-gradient(135deg,rgba(212,175,55,0.15),rgba(168,139,32,0.1));border:1px solid #D4AF37;border-radius:10px;padding:14px 24px;text-align:right;">
                    <div style="color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Grand Total</div>
                    <div style="color:#D4AF37;font-size:24px;font-weight:800;margin-top:4px;">$${(q.total_amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${q.notes ? `
        <!-- Notes -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="background:#1c1f26;border-left:3px solid #D4AF37;border-radius:0 8px 8px 0;padding:14px 16px;">
              <div style="color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Notes</div>
              <p style="color:#e5e7eb;font-size:13px;margin:0;line-height:1.6;">${q.notes}</p>
            </div>
          </td>
        </tr>` : ""}

        <!-- Accept / Reject -->
        <tr>
          <td style="padding:0 32px 32px;">
            <div style="background:#1c1f26;border-radius:12px;padding:24px;text-align:center;">
              <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;line-height:1.6;">
                Please review the quotation above and let us know your decision.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="padding:0 8px 0 0;">
                    <a href="${q.accept_url}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                      ✓ &nbsp;Accept Quote
                    </a>
                  </td>
                  <td style="padding:0 0 0 8px;">
                    <a href="${q.reject_url}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                      ✕ &nbsp;Reject Quote
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:11px;margin:16px 0 0;">
                Clicking a button will record your response and notify the SondosStone team.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0f14;padding:20px 32px;text-align:center;border-top:1px solid #2a2a2a;">
            <p style="color:#6b7280;font-size:12px;margin:0;">
              This is an automated quote from <strong style="color:#D4AF37;">SondosStone ERP</strong>.<br>
              For questions, please reply to this email or contact your sales representative.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request, { params }: { params: Params }) {
  const quoteId = params.id;

  // Fetch quote with customer and items
  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .select("id, quote_id, total_amount, quote_date, status, notes, payment_type, customers(id, name, email)")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: quoteError?.message ?? "Quote not found" }, { status: 404 });
  }

  const { data: items } = await supabaseAdmin
    .from("quote_items")
    .select("description, quantity, unit_price, line_total")
    .eq("quote_id", quoteId);

  const customer = (quote.customers as any);
  const customerEmail = customer?.email;
  const customerName = customer?.name ?? "Valued Customer";

  if (!customerEmail) {
    return NextResponse.json({ error: "Customer email is missing — please add an email to the customer profile." }, { status: 400 });
  }

  // Fetch layout for canvas image
  const { data: layout } = await supabaseAdmin
    .from("layouts")
    .select("layout_data")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const canvasImageDataUrl: string | null = layout?.layout_data?.canvas_image ?? null;

  // Generate a unique response token and save it to the quote
  const responseToken = randomUUID();
  await supabaseAdmin.from("quotes").update({ quote_token: responseToken }).eq("id", quoteId);

  // Build accept/reject URLs
  const origin = new URL(req.url).origin;
  const acceptUrl = `${origin}/api/quotes/respond?token=${responseToken}&action=accept`;
  const rejectUrl = `${origin}/api/quotes/respond?token=${responseToken}&action=reject`;

  // Build the email HTML
  const html = buildQuoteHtml({
    quote_id: quote.quote_id,
    customer_name: customerName,
    quote_date: quote.quote_date ?? new Date().toISOString().split("T")[0],
    payment_type: (quote as any).payment_type ?? null,
    notes: quote.notes ?? null,
    items: (items ?? []) as any,
    total_amount: quote.total_amount ?? 0,
    accept_url: acceptUrl,
    reject_url: rejectUrl,
    has_drawing: !!canvasImageDataUrl,
  });

  // Prepare attachments: inline canvas image if available
  const attachments: { filename: string; content: Buffer; contentType: string; cid: string }[] = [];
  if (canvasImageDataUrl) {
    try {
      const base64Data = canvasImageDataUrl.split(",")[1];
      if (base64Data) {
        attachments.push({
          filename: "layout-drawing.png",
          content: Buffer.from(base64Data, "base64"),
          contentType: "image/png",
          cid: "drawing@sondosstone",
        });
      }
    } catch {}
  }

  let emailError: string | null = null;
  let emailStatus: "sent" | "failed" = "sent";

  try {
    await sendEmail({
      to: customerEmail,
      toName: customerName,
      subject: `Quotation ${quote.quote_id} — SondosStone`,
      html,
      attachments: attachments.length ? attachments : undefined,
    });
  } catch (err: any) {
    emailError = err.message ?? "Unknown error";
    emailStatus = "failed";
  }

  // Log to email_logs
  await supabaseAdmin.from("email_logs").insert({
    quote_id: quoteId,
    quote_ref: quote.quote_id,
    recipient_email: customerEmail,
    recipient_name: customerName,
    subject: `Quotation ${quote.quote_id} — SondosStone`,
    status: emailStatus,
    error_message: emailError,
    sent_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error && !error.message.includes("email_logs")) {
      console.error("email_logs insert error:", error.message);
    }
  });

  // Update quote status to "sent" if it was draft
  if (emailStatus === "sent" && quote.status === "draft") {
    await supabaseAdmin.from("quotes").update({ status: "sent" }).eq("id", quoteId);
  }

  if (emailStatus === "failed") {
    return NextResponse.json({ error: emailError }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: `Quotation emailed to ${customerEmail}` });
}
