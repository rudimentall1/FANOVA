import { createHash } from "node:crypto";

export type AuthEmailKind = "verification" | "password-reset";
export type AuthEmailDeliveryStatus = "development-sink" | "resend" | "unconfigured";

export interface ResendEmailConfiguration {
  apiKey: string;
  from: string;
  appOrigin: string;
}

export interface AuthEmailMessage {
  kind: AuthEmailKind;
  to: string;
  name?: string | null;
  url: string;
}

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

export function getResendEmailConfiguration(
  env: NodeJS.ProcessEnv = process.env
): ResendEmailConfiguration {
  if (env.FANOVA_EMAIL_PROVIDER?.trim().toLowerCase() !== "resend") {
    throw new Error("Production auth email requires FANOVA_EMAIL_PROVIDER=resend.");
  }

  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.FANOVA_EMAIL_FROM?.trim();
  if (!apiKey || !from || /[\r\n]/.test(apiKey) || /[\r\n]/.test(from)) {
    throw new Error(
      "Production auth email requires RESEND_API_KEY and a valid FANOVA_EMAIL_FROM value."
    );
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(env.BETTER_AUTH_URL?.trim() ?? "");
  } catch {
    throw new Error("BETTER_AUTH_URL must be an absolute HTTPS URL.");
  }
  if (baseUrl.protocol !== "https:" || !baseUrl.hostname) {
    throw new Error("BETTER_AUTH_URL must be an absolute HTTPS URL.");
  }
  if (baseUrl.username || baseUrl.password) {
    throw new Error("BETTER_AUTH_URL must not contain credentials.");
  }

  return { apiKey, from, appOrigin: baseUrl.origin };
}

export function getAuthEmailDeliveryStatus(
  env: NodeJS.ProcessEnv = process.env
): AuthEmailDeliveryStatus {
  if (env.NODE_ENV !== "production") return "development-sink";

  try {
    getResendEmailConfiguration(env);
    return "resend";
  } catch {
    return "unconfigured";
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return character;
    }
  });
}

function buildAuthEmailContent(message: AuthEmailMessage) {
  const isVerification = message.kind === "verification";
  const name = (message.name ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, 80) || "there";
  const action = isVerification ? "verify your email address" : "reset your password";
  const subject = isVerification
    ? "Verify your FANOVA email address"
    : "Reset your FANOVA password";
  const linkLabel = isVerification ? "Verify email address" : "Reset password";
  const explanation = `Use the link below to ${action}.`;
  const safetyNote = "If you did not request this, you can ignore this email.";

  return {
    subject,
    text: `Hello ${name},\n\n${explanation}\n\n${message.url}\n\n${safetyNote}\n`,
    html: [
      "<!doctype html>",
      '<html lang="en"><body>',
      `<p>Hello ${escapeHtml(name)},</p>`,
      `<p>${explanation}</p>`,
      `<p><a href="${escapeHtml(message.url)}">${linkLabel}</a></p>`,
      `<p>${safetyNote}</p>`,
      "</body></html>"
    ].join("")
  };
}

export async function sendAuthEmailWithResend(
  message: AuthEmailMessage,
  configuration: ResendEmailConfiguration,
  fetcher: typeof fetch = fetch
): Promise<void> {
  const recipient = message.to.trim();
  if (!recipient || /[\r\n]/.test(recipient)) {
    throw new Error("Auth email recipient is invalid.");
  }

  let verificationUrl: URL;
  try {
    verificationUrl = new URL(message.url);
  } catch {
    throw new Error("Auth email URL must be absolute.");
  }
  if (verificationUrl.protocol !== "https:") {
    throw new Error("Production auth email links must use HTTPS.");
  }
  if (verificationUrl.username || verificationUrl.password) {
    throw new Error("Production auth email links must not contain credentials.");
  }
  if (verificationUrl.origin !== configuration.appOrigin) {
    throw new Error("Auth email URL does not match the configured FANOVA origin.");
  }

  const content = buildAuthEmailContent(message);
  const payload = {
    from: configuration.from,
    to: [recipient],
    subject: content.subject,
    text: content.text,
    html: content.html
  };
  const idempotencyDigest = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  let response: Response;
  try {
    response = await fetcher(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `fanova-${idempotencyDigest}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    throw new Error("Resend email request failed (network or timeout).");
  }

  if (!response.ok) {
    throw new Error(`Resend rejected the email request (HTTP ${response.status}).`);
  }
}
