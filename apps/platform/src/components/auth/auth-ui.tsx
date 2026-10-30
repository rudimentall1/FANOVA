"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type FormStatus = { kind: "error" | "success"; message: string } | null;

function AuthShell({ eyebrow, title, intro, children }: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">FANOVA</Link>
      <section className="auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-intro">{intro}</p>
        {children}
      </section>
      <p className="auth-foot">Creator-controlled collaborative storytelling.</p>
    </main>
  );
}

function StatusMessage({ status }: { status: FormStatus }) {
  if (!status) return null;
  return <p className={status.kind === "error" ? "form-status error" : "form-status success"} role="status">{status.message}</p>;
}

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        callbackURL: "/dashboard"
      });
      if (result.error) {
        setStatus({ kind: "error", message: result.error.message ?? "Could not create the account." });
      } else {
        setStatus({
          kind: "success",
          message: "If this address can be registered, a verification link has been sent. Check your inbox. In local development, the link is printed in the application terminal."
        });
      }
    } catch {
      setStatus({ kind: "error", message: "The registration service is unavailable. Try again shortly." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="CREATE AN ACCOUNT" title="Join FANOVA." intro="Create an account to contribute to stories or publish your own work.">
      <form className="auth-form" onSubmit={submit}>
        <label>Display name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <p className="field-note">At least 8 characters. Your account starts with reader access. Creator access is granted separately.</p>
        <button className="primary-button" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <StatusMessage status={status} />
      </form>
      <p className="auth-switch">Already registered? <Link href="/sign-in">Sign in</Link></p>
    </AuthShell>
  );
}

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: "/dashboard",
        rememberMe: true
      });
      if (result.error) {
        setStatus({
          kind: "error",
          message: result.error.status === 403
            ? "Verify your email address before signing in. A verification link may have been sent."
            : result.error.message ?? "Could not sign in."
        });
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setStatus({ kind: "error", message: "The sign-in service is unavailable. Try again shortly." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="WELCOME BACK" title="Sign in." intro="Continue to your FANOVA workspace.">
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <div className="form-inline"><span /> <Link href="/forgot-password">Forgot password?</Link></div>
        <button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <StatusMessage status={status} />
      </form>
      <p className="auth-switch">New to FANOVA? <Link href="/sign-up">Create an account</Link></p>
    </AuthShell>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password"
      });
      if (result.error) {
        setStatus({ kind: "error", message: result.error.message ?? "Could not request a password reset." });
      } else {
        setStatus({
          kind: "success",
          message: "If an account exists for this address, a reset link has been sent. In local development, check the application terminal."
        });
      }
    } catch {
      setStatus({ kind: "error", message: "The password reset service is unavailable. Try again shortly." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="ACCOUNT RECOVERY" title="Reset password." intro="Enter the email address associated with your account.">
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button className="primary-button" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        <StatusMessage status={status} />
      </form>
      <p className="auth-switch"><Link href="/sign-in">Back to sign in</Link></p>
    </AuthShell>
  );
}

export function ResetPasswordForm({ token, invalidToken = false }: { token?: string; invalidToken?: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<FormStatus>(
    invalidToken || !token ? { kind: "error", message: "This reset link is invalid or has expired. Request a new one." } : null
  );
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password !== confirm) {
      setStatus({ kind: "error", message: "The passwords do not match." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setStatus({ kind: "error", message: result.error.message ?? "Could not reset the password." });
      } else {
        setStatus({ kind: "success", message: "Password updated. You can now sign in." });
        setPassword("");
        setConfirm("");
      }
    } catch {
      setStatus({ kind: "error", message: "The password reset service is unavailable. Request a new link." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="ACCOUNT RECOVERY" title="Choose a new password." intro="Use a password you have not used elsewhere.">
      <form className="auth-form" onSubmit={submit}>
        <label>New password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
        <button className="primary-button" disabled={busy || !token}>{busy ? "Updating…" : "Update password"}</button>
        <StatusMessage status={status} />
      </form>
      <p className="auth-switch"><Link href="/sign-in">Back to sign in</Link></p>
    </AuthShell>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }
  return <button className="secondary-button" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>;
}