import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

const secret = process.env.BETTER_AUTH_SECRET;
if (process.env.NODE_ENV !== "test" && (!secret || secret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

const isProduction = process.env.NODE_ENV === "production";

async function localMailSink(kind: string, url: string) {
  if (isProduction) {
    throw new Error("Production email delivery is not configured.");
  }
  console.info("[FANOVA local mail sink]", kind, url);
}

export const auth = betterAuth({
  secret: secret ?? "fanova-test-only-secret-not-for-production",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ url }) => localMailSink("password-reset", url)
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ url }) => localMailSink("verification", url)
  },
  session: {
    expiresIn: 604800,
    updateAge: 86400
  },
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction
    }
  }
});