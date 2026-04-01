/**
 * Transactional email module — powered by Resend.
 *
 * Security note: ALL user-supplied strings that appear in HTML templates must be
 * passed through `escapeHtml()` to prevent XSS injection in email clients that
 * render HTML. URLs must be validated to the `https://` scheme to prevent
 * `javascript:` or `data:` protocol injection.
 */

import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);

// ─── HTML helpers ─────────────────────────────────────────────────────────────

/**
 * Escapes the five HTML special characters to their entity equivalents.
 * Must be applied to every user-controlled string before HTML interpolation.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates that a URL uses the `https://` or (in dev) `http://` scheme.
 * Returns `"#"` for any URL that would allow protocol injection.
 */
function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "#";
    return url;
  } catch {
    return "#";
  }
}

// ─── Core send wrapper ────────────────────────────────────────────────────────

interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/** Sends a transactional email via Resend. No-ops in test environments. */
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

// ─── Email templates ──────────────────────────────────────────────────────────

/** Branded wrapper shared by all templates. */
function htmlWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: Georgia, serif; background: #f5edd8; padding: 32px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px;">
    ${body}
    <p style="color: #aaa; font-size: 11px; margin-top: 40px; border-top: 1px solid #e8dfc8; padding-top: 16px;">
      Hellenic Directory of America · <a href="https://hellenicdir.com/unsubscribe" style="color: #aaa;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}

/**
 * Generates the HTML body for a new-account email verification message.
 * @param opts.fullName  User's display name (user-supplied — HTML-escaped).
 * @param opts.verifyUrl Verification link (validated to https scheme).
 */
export function verifyEmailHtml(opts: { fullName: string; verifyUrl: string }): string {
  const name = escapeHtml(opts.fullName);
  const url = safeUrl(opts.verifyUrl);
  return htmlWrapper(`
    <h1 style="color: #1b2a4a; font-size: 22px; margin-top: 0;">Verify your email address</h1>
    <p style="color: #2d2d2d;">Hi ${name},</p>
    <p style="color: #2d2d2d;">
      Thank you for joining the <strong>Hellenic Directory of America</strong>.
      Please verify your email address to activate your account.
    </p>
    <p style="margin-top: 32px;">
      <a href="${url}"
         style="background:#c9a84c;color:#1b2a4a;padding:12px 24px;border-radius:4px;
                text-decoration:none;font-weight:bold;display:inline-block;">
        Verify Email Address
      </a>
    </p>
    <p style="color: #888; font-size: 12px; margin-top: 24px;">
      This link expires in 24 hours. If you did not create an account, you can ignore this email.
    </p>`);
}

/**
 * Generates the HTML body for a directory invitation email.
 * @param opts.directoryName Name of the directory (user-supplied — HTML-escaped).
 * @param opts.inviterName   Inviting member's display name (user-supplied — HTML-escaped).
 * @param opts.inviteUrl     Accept-invitation link (validated to https scheme).
 */
export function inviteEmailHtml(opts: {
  directoryName: string;
  inviterName: string;
  inviteUrl: string;
}): string {
  const directory = escapeHtml(opts.directoryName);
  const inviter = escapeHtml(opts.inviterName);
  const url = safeUrl(opts.inviteUrl);
  return htmlWrapper(`
    <h1 style="color: #1b2a4a; font-size: 22px; margin-top: 0;">You've been invited</h1>
    <p style="color: #2d2d2d;">
      <strong>${inviter}</strong> has invited you to join the
      <strong>${directory}</strong> directory on the
      <em>Hellenic Directory of America</em>.
    </p>
    <p style="margin-top: 32px;">
      <a href="${url}"
         style="background:#c9a84c;color:#1b2a4a;padding:12px 24px;border-radius:4px;
                text-decoration:none;font-weight:bold;display:inline-block;">
        Accept Invitation
      </a>
    </p>
    <p style="color: #888; font-size: 12px; margin-top: 24px;">
      This link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
    </p>`);
}

/**
 * Generates the HTML body for a forwarded in-app message notification.
 * @param opts.senderName    Message sender's display name (user-supplied — HTML-escaped).
 * @param opts.directoryName Source directory name (user-supplied — HTML-escaped).
 * @param opts.body          Message body (user-supplied — HTML-escaped; newlines converted to <br>).
 * @param opts.appUrl        Base URL of the web client (validated to https scheme).
 */
export function messageForwardHtml(opts: {
  senderName: string;
  directoryName: string;
  body: string;
  appUrl: string;
}): string {
  const sender = escapeHtml(opts.senderName);
  const directory = escapeHtml(opts.directoryName);
  // Escape first, then convert newlines to <br> so multi-line messages render correctly.
  const body = escapeHtml(opts.body).replace(/\n/g, "<br>");
  const url = safeUrl(opts.appUrl);
  return htmlWrapper(`
    <h2 style="color: #1b2a4a; margin-top: 0;">New message from ${sender}</h2>
    <p style="color: #888; font-size: 13px;">Via ${directory} on Hellenic Directory of America</p>
    <hr style="border: 1px solid #e0d5c0; margin: 24px 0;">
    <p style="color: #2d2d2d; line-height: 1.6;">${body}</p>
    <p style="margin-top: 32px;">
      <a href="${url}/messages"
         style="background:#1b2a4a;color:#c9a84c;padding:12px 24px;border-radius:4px;
                text-decoration:none;font-weight:bold;display:inline-block;">
        Reply in App
      </a>
    </p>`);
}
