import { describe, expect, it } from "vitest";
import {
  getAuthEmailDeliveryStatus,
  getResendEmailConfiguration,
  sendAuthEmailWithResend
} from "./email-delivery";

const configuration = {
  apiKey: "re_test_sending_key",
  from: "FANOVA <no-reply@example.com>",
  appOrigin: "https://fanova.example"
};

function createFetchMock(status = 200) {
  let captured: { url: string; init: RequestInit } | undefined;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured = { url: input.toString(), init: init ?? {} };
    return new Response(null, { status });
  }) as typeof fetch;

  return {
    fetcher,
    get captured() {
      return captured;
    }
  };
}

describe("production auth email configuration", () => {
  it("requires the explicit Resend provider and its credentials", () => {
    expect(() => getResendEmailConfiguration({
      NODE_ENV: "production"
    })).toThrow("FANOVA_EMAIL_PROVIDER=resend");

    expect(() => getResendEmailConfiguration({
      NODE_ENV: "production",
      FANOVA_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test_key",
      BETTER_AUTH_URL: "https://fanova.example"
    })).toThrow("RESEND_API_KEY and a valid FANOVA_EMAIL_FROM");
  });

  it("rejects sender values containing header line breaks", () => {
    expect(() => getResendEmailConfiguration({
      NODE_ENV: "production",
      FANOVA_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test_key",
      FANOVA_EMAIL_FROM: "FANOVA <sender@example.com>\r\nBcc: victim@example.com"
    })).toThrow("RESEND_API_KEY and a valid FANOVA_EMAIL_FROM");
  });

  it("rejects non-HTTPS production auth base URLs", () => {
    expect(() => getResendEmailConfiguration({
      NODE_ENV: "production",
      FANOVA_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test_key",
      FANOVA_EMAIL_FROM: "FANOVA <sender@example.com>",
      BETTER_AUTH_URL: "http://fanova.example"
    })).toThrow("BETTER_AUTH_URL must be an absolute HTTPS URL");
  });

  it("rejects production auth base URLs with embedded credentials", () => {
    expect(() => getResendEmailConfiguration({
      NODE_ENV: "production",
      FANOVA_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test_key",
      FANOVA_EMAIL_FROM: "FANOVA <sender@example.com>",
      BETTER_AUTH_URL: "https://user:password@fanova.example"
    })).toThrow("BETTER_AUTH_URL must not contain credentials");
  });

  it("reports the development sink, configured production provider, and missing setup", () => {
    expect(getAuthEmailDeliveryStatus({ NODE_ENV: "development" })).toBe("development-sink");
    expect(getAuthEmailDeliveryStatus({ NODE_ENV: "production" })).toBe("unconfigured");
    expect(getAuthEmailDeliveryStatus({
      NODE_ENV: "production",
      FANOVA_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test_key",
      FANOVA_EMAIL_FROM: "FANOVA <sender@example.com>",
      BETTER_AUTH_URL: "https://fanova.example"
    })).toBe("resend");
    expect(getAuthEmailDeliveryStatus({
      NODE_ENV: "production",
      FANOVA_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test_key",
      FANOVA_EMAIL_FROM: "FANOVA <sender@example.com>",
      BETTER_AUTH_URL: "http://fanova.example"
    })).toBe("unconfigured");
  });
});

describe("Resend auth email delivery", () => {
  it("sends a verification email with escaped HTML, a bounded timeout, and an idempotency key", async () => {
    const mock = createFetchMock(202);
    const url = "https://fanova.example/verify-email?token=opaque&callbackURL=%2F";
    await sendAuthEmailWithResend({
      kind: "verification",
      to: "creator@example.com",
      name: '<img src=x onerror="alert(1)">',
      url
    }, configuration, mock.fetcher);

    expect(mock.captured?.url).toBe("https://api.resend.com/emails");
    expect(mock.captured?.init.method).toBe("POST");
    const headers = mock.captured?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test_sending_key");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Idempotency-Key"]).toMatch(/^fanova-[a-f0-9]{64}$/);
    expect(mock.captured?.init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(mock.captured?.init.body as string);
    expect(body.to).toEqual(["creator@example.com"]);
    expect(body.subject).toBe("Verify your FANOVA email address");
    expect(body.text).toContain(url);
    expect(body.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(body.html).toContain("token=opaque&amp;callbackURL=%2F");
    expect(body.html).not.toContain("<img");
  });

  it("rejects auth email links whose origin differs from the configured FANOVA origin", async () => {
    const mock = createFetchMock();
    await expect(sendAuthEmailWithResend({
      kind: "verification",
      to: "creator@example.com",
      url: "https://attacker.example/verify-email?token=opaque"
    }, configuration, mock.fetcher)).rejects.toThrow("does not match the configured FANOVA origin");
    expect(mock.captured).toBeUndefined();
  });

  it("uses the password-reset subject and template", async () => {
    const mock = createFetchMock();
    await sendAuthEmailWithResend({
      kind: "password-reset",
      to: "creator@example.com",
      url: "https://fanova.example/reset-password?token=opaque"
    }, configuration, mock.fetcher);

    const body = JSON.parse(mock.captured?.init.body as string);
    expect(body.subject).toBe("Reset your FANOVA password");
    expect(body.html).toContain("Reset password");
  });

  it("refuses non-HTTPS auth links before making a provider request", async () => {
    const mock = createFetchMock();
    await expect(sendAuthEmailWithResend({
      kind: "verification",
      to: "creator@example.com",
      url: "http://fanova.example/verify-email?token=opaque"
    }, configuration, mock.fetcher)).rejects.toThrow("must use HTTPS");
    expect(mock.captured).toBeUndefined();
  });

  it("does not expose provider response bodies or tokens in errors", async () => {
    const mock = createFetchMock(429);
    await expect(sendAuthEmailWithResend({
      kind: "verification",
      to: "creator@example.com",
      url: "https://fanova.example/verify-email?token=secret-token"
    }, configuration, mock.fetcher)).rejects.toThrow("HTTP 429");
  });

  it("converts network errors to a sanitized delivery failure", async () => {
    const fetcher = (async () => {
      throw new Error("request contained a secret token");
    }) as typeof fetch;

    const error = await sendAuthEmailWithResend({
      kind: "verification",
      to: "creator@example.com",
      url: "https://fanova.example/verify-email?token=secret-token"
    }, configuration, fetcher).then(() => null, (caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("network or timeout");
    expect((error as Error).message).not.toContain("secret-token");
  });
});
