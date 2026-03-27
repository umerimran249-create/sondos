import Mailjet from "node-mailjet";

export interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const fromEmail = process.env.MAILJET_FROM_EMAIL || "quotes@sondosstone.com";
  const fromName = process.env.MAILJET_FROM_NAME || "SondosStone";

  if (!apiKey || !secretKey) {
    throw new Error("Mailjet API keys are not configured (MAILJET_API_KEY / MAILJET_SECRET_KEY)");
  }

  const mj = Mailjet.apiConnect(apiKey, secretKey);

  const attachments = (options.attachments ?? []).map((a) => ({
    ContentType: a.contentType || "application/octet-stream",
    Filename: a.filename,
    Base64Content: a.content.toString("base64"),
  }));

  const body: Record<string, unknown> = {
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: [{ Email: options.to, Name: options.toName || options.to }],
        Subject: options.subject,
        HTMLPart: options.html,
        TextPart: options.text || stripHtml(options.html),
        ...(attachments.length ? { Attachments: attachments } : {}),
      },
    ],
  };

  const result = await mj.post("send", { version: "v3.1" }).request(body);
  const response = result.body as any;
  const msgStatus = response?.Messages?.[0]?.Status;
  if (msgStatus && msgStatus !== "success") {
    throw new Error(`Mailjet send failed: ${JSON.stringify(response?.Messages?.[0]?.Errors ?? msgStatus)}`);
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
