"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreatorAccessForm() {
  const router = useRouter();
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [statement, setStatement] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/creator-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioUrl, statement })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not submit your application.");
        return;
      }
      setMessage("Your creator application has been submitted. Creator access is granted only after an administrator reviews it.");
      setPortfolioUrl("");
      setStatement("");
      router.refresh();
    } catch {
      setError("The creator application service is unavailable. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="work-form" onSubmit={submit}>
      <label>Portfolio or public work URL (optional)<input type="url" maxLength={500} value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://…" /></label>
      <label>What do you create, and what would you publish on FANOVA?<textarea required minLength={50} maxLength={2000} rows={7} value={statement} onChange={(e) => setStatement(e.target.value)} /></label>
      <p className="field-note">An application does not grant creator permissions. An administrator reviews the request and records the decision.</p>
      <button className="primary-button" disabled={busy}>{busy ? "Submitting…" : "Submit creator application"}</button>
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
      {message ? <p className="form-status success" role="status">{message}</p> : null}
    </form>
  );
}

export function CreatorRequestReview({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/creator-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not record the decision.");
        return;
      }
      router.refresh();
    } catch {
      setError("The review service is unavailable. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-actions">
      <button className="primary-button" disabled={busy} onClick={() => decide("approve")}>Approve creator</button>
      <button className="secondary-button" disabled={busy} onClick={() => decide("reject")}>Reject</button>
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
    </div>
  );
}