/**
 * Email utility — Gmail SMTP via Nodemailer
 * Set: GMAIL_USER (your Gmail address)
 *      GMAIL_APP_PASSWORD (Google App Password from myaccount.google.com/apppasswords)
 */

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
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const fromName  = process.env.EMAIL_FROM_NAME || "SondosStone";

  if (!gmailUser || !gmailPass) {
    throw new Error("Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.");
  }

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
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
