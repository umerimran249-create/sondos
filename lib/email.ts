/**
 * Email utility — supports multiple free providers (tried in order):
 *
 *  1. Brevo SMTP (recommended — 300 free/day, no domain needed, cloud-friendly)
 *     Set: BREVO_SMTP_KEY  (from brevo.com → Settings → SMTP & API)
 *          BREVO_SMTP_USER (your Brevo login email)
 *
 *  2. Gmail SMTP (500/day — may be blocked by Google from cloud servers)
 *     Set: GMAIL_USER + GMAIL_APP_PASSWORD
 *
 *  3. Resend API (3,000 free/month — requires verified domain for other recipients)
 *     Set: RESEND_API_KEY
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const resendKey    = process.env.RESEND_API_KEY;
  const gmailUser    = process.env.GMAIL_USER;
  const gmailPass    = process.env.GMAIL_APP_PASSWORD;
  const brevoKey     = process.env.BREVO_SMTP_KEY;
  const brevoUser    = process.env.BREVO_SMTP_USER;
  const fromName     = process.env.EMAIL_FROM_NAME || "SondosStone";

  // ── 1. Brevo SMTP (best for cloud servers — no domain needed, 300/day free) ─
  if (brevoKey && brevoUser) {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: brevoUser, pass: brevoKey },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${brevoUser}>`,
      to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return;
  }

  // ── 2. Gmail SMTP ──────────────────────────────────────────────────────────
  if (gmailUser && gmailPass) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${gmailUser}>`,
      to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return;
  }

  // ── 3. Resend (requires verified domain for sending to others) ─────────────
  if (resendKey) {
    const resend = new Resend(resendKey);
    const fromName = process.env.EMAIL_FROM_NAME || "SondosStone";
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev"; // resend sandbox domain

    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.toName ? `${options.toName} <${options.to}>` : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) throw new Error(`Resend error: ${error.message}`);
    return;
  }

  throw new Error(
    "No email provider configured. Set BREVO_SMTP_KEY + BREVO_SMTP_USER (recommended), or GMAIL_USER + GMAIL_APP_PASSWORD."
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
