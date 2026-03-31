import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(opts: SendMailOptions) {
  if (env.NODE_ENV === "test") return;
  if (!env.RESEND_API_KEY) {
    console.warn("[Mailer] RESEND_API_KEY not set — skipping email");
    return;
  }
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

export function inviteEmailHtml(opts: {
  directoryName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background: #f5edd8; padding: 32px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px;">
    <h1 style="color: #1b2a4a; font-size: 24px;">You've been invited</h1>
    <p style="color: #2d2d2d;">
      <strong>${opts.inviterName}</strong> has invited you to join the
      <strong>${opts.directoryName}</strong> directory on the
      <em>Hellenic Directory of America</em>.
    </p>
    <p style="margin-top: 32px;">
      <a href="${opts.inviteUrl}"
         style="background:#c9a84c;color:#1b2a4a;padding:12px 24px;border-radius:4px;
                text-decoration:none;font-weight:bold;display:inline-block;">
        Accept Invitation
      </a>
    </p>
    <p style="color: #888; font-size: 12px; margin-top: 32px;">
      This link expires in 7 days. If you did not expect this invitation, you can ignore this email.
    </p>
  </div>
</body>
</html>`;
}

export function messageForwardHtml(opts: {
  senderName: string;
  directoryName: string;
  body: string;
  appUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #f5edd8; padding: 32px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px;">
    <h2 style="color: #1b2a4a;">New message from ${opts.senderName}</h2>
    <p style="color: #888; font-size: 13px;">Via ${opts.directoryName} on Hellenic Directory of America</p>
    <hr style="border: 1px solid #e0d5c0; margin: 24px 0;">
    <p style="color: #2d2d2d; white-space: pre-wrap;">${opts.body}</p>
    <p style="margin-top: 32px;">
      <a href="${opts.appUrl}/messages"
         style="background:#1b2a4a;color:#c9a84c;padding:12px 24px;border-radius:4px;
                text-decoration:none;font-weight:bold;display:inline-block;">
        Reply in App
      </a>
    </p>
  </div>
</body>
</html>`;
}
