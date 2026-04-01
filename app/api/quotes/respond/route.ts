import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function buildResponsePage(status: "accepted" | "rejected" | "already_responded" | "error", quoteId?: string): string {
  const configs = {
    accepted: {
      icon: "✅",
      title: "Quote Accepted",
      subtitle: quoteId ? `Quote ${quoteId} has been accepted.` : "Your quote has been accepted.",
      message: "Thank you! The SondosStone team has been notified and will be in touch shortly to proceed with your order.",
      color: "#22c55e",
      bg: "#0d2818",
      border: "#22c55e",
      shadow: "rgba(34,197,94,0.25)",
    },
    rejected: {
      icon: "❌",
      title: "Quote Rejected",
      subtitle: quoteId ? `Quote ${quoteId} has been rejected.` : "Your quote has been rejected.",
      message: "We're sorry this quote didn't meet your needs. The SondosStone team has been notified and may reach out to discuss alternatives.",
      color: "#ef4444",
      bg: "#2a0d0d",
      border: "#ef4444",
      shadow: "rgba(239,68,68,0.25)",
    },
    already_responded: {
      icon: "ℹ️",
      title: "Already Responded",
      subtitle: "This quote has already been responded to.",
      message: "Your response was previously recorded. No further action is needed.",
      color: "#60a5fa",
      bg: "#0d1421",
      border: "#60a5fa",
      shadow: "rgba(96,165,250,0.25)",
    },
    error: {
      icon: "⚠️",
      title: "Invalid Link",
      subtitle: "This response link is not valid.",
      message: "The link may have expired or already been used. Please contact the SondosStone team directly.",
      color: "#D4AF37",
      bg: "#1a150a",
      border: "#D4AF37",
      shadow: "rgba(212,175,55,0.25)",
    },
  };

  const cfg = configs[status];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${cfg.title} — SondosStone</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0b0d11;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:${cfg.bg};border:2px solid ${cfg.border};border-radius:20px;padding:48px 40px;max-width:480px;width:100%;text-align:center;box-shadow:0 0 80px ${cfg.shadow}}
    .icon{font-size:64px;line-height:1;margin-bottom:24px}
    .brand{color:#D4AF37;font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:24px}
    .title{color:#ffffff;font-size:24px;font-weight:800;margin-bottom:8px}
    .subtitle{color:${cfg.color};font-size:15px;font-weight:600;margin-bottom:16px}
    .message{color:#9ca3af;font-size:14px;line-height:1.7}
    .divider{height:1px;background:#2a2a2a;margin:28px 0}
    .footer{color:#6b7280;font-size:12px}
    @media(max-width:500px){.card{padding:32px 24px}.title{font-size:20px}.icon{font-size:52px}}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">SondosStone</div>
    <div class="icon">${cfg.icon}</div>
    <div class="title">${cfg.title}</div>
    <div class="subtitle">${cfg.subtitle}</div>
    <p class="message">${cfg.message}</p>
    <div class="divider"></div>
    <p class="footer">You may close this window. For questions, contact us at your SondosStone representative.</p>
  </div>
</body>
</html>`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action");

  const htmlHeaders = { "Content-Type": "text/html; charset=utf-8" };

  if (!token || !["accept", "reject"].includes(action ?? "")) {
    return new Response(buildResponsePage("error"), { headers: htmlHeaders });
  }

  // Find quote by token
  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("id, quote_id, status")
    .eq("quote_token", token)
    .single();

  if (error || !quote) {
    return new Response(buildResponsePage("error"), { headers: htmlHeaders });
  }

  // Already responded?
  if (quote.status === "approved" || quote.status === "rejected") {
    return new Response(buildResponsePage("already_responded", quote.quote_id), { headers: htmlHeaders });
  }

  const newStatus = action === "accept" ? "approved" : "rejected";

  // Update quote status
  await supabaseAdmin.from("quotes").update({ status: newStatus }).eq("id", quote.id);

  // Update linked job status
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id")
    .eq("quote_id", quote.id)
    .maybeSingle();

  if (job) {
    const jobStatus = action === "accept" ? "templating" : "cancelled";
    await supabaseAdmin.from("jobs").update({ status: jobStatus }).eq("id", job.id);
  }

  return new Response(
    buildResponsePage(action === "accept" ? "accepted" : "rejected", quote.quote_id),
    { headers: htmlHeaders }
  );
}
