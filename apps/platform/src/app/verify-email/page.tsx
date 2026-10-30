import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">FANOVA</Link>
      <section className="auth-card">
        <p className="eyebrow">EMAIL VERIFICATION</p>
        <h1>Check your inbox.</h1>
        <p className="auth-intro">Open the verification link sent to your email address. You need a verified email before signing in.</p>
        <p className="field-note">During local development, FANOVA prints the verification link in the terminal running the application. A production email provider has not been configured yet.</p>
        <Link className="primary-button button-link" href="/sign-in">Continue to sign in</Link>
      </section>
      <p className="auth-foot">Creator-controlled collaborative storytelling.</p>
    </main>
  );
}