/**
 * Email utility — supports two free providers:
 *
 *  1. Resend (recommended — 3,000 free/month)
 *     Set: RESEND_API_KEY
 *
 *  2. Gmail SMTP via Nodemailer (completely free — 500/day)
 *     Set: GMAIL_USER  (your Gmail address)
 *          GMAIL_APP_PASSWORD  (Google App Password — NOT your normal password)
 *
 * The system tries Resend first, then falls back to Gmail SMTP.
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
  const resendKey = process.env.RESEND_API_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // ── 1. Gmail SMTP (preferred when configured — no recipient restrictions) ──
  if (gmailUser && gmailPass) {
    const fromName = process.env.EMAIL_FROM_NAME || "SondosStone";
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

  // ── 2. Resend (requires verified domain for sending to others) ─────────────
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
    "No email provider configured. Set GMAIL_USER + GMAIL_APP_PASSWORD (recommended) or RESEND_API_KEY."
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
