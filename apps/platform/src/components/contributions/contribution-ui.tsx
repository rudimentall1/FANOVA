"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkPermissions } from "@/db/schema/content";
import { CreatorDecisionProvenanceAction } from "./creator-decision-provenance-action";

export function SubmitContributionForm({
  slug,
  permissions,
  permissionHash
}: {
  slug: string;
  permissions: WorkPermissions;
  permissionHash: string;
}) {
  const router = useRouter();
  const allowedTypes = [
    ...(permissions.fanArt ? [{ value: "fan_art", label: "Fan art" }] : []),
    ...(permissions.translations ? [{ value: "translation", label: "Translation" }] : []),
    ...(permissions.adaptations ? [{ value: "adaptation", label: "Adaptation" }] : [])
  ];
  const [type, setType] = useState(allowedTypes[0]?.value ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [commercialIntent, setCommercialIntent] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/works/${slug}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, content, commercialIntent, acknowledgePermissions: acknowledged })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not submit your contribution.");
        return;
      }
      router.push("/dashboard/contributions");
      router.refresh();
    } catch {
      setError("The contribution service is unavailable. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  if (allowedTypes.length === 0) {
    return <section className="empty-state"><h2>Contributions are not enabled.</h2><p>The creator has not permitted fan art, translations, or adaptations for this work.</p></section>;
  }

  return (
    <form className="work-form" onSubmit={submit}>
      <label>Contribution type<select required value={type} onChange={(e) => setType(e.target.value)}>
        {allowedTypes.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
      </select></label>
      <label>Title<input required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Your contribution<textarea required minLength={100} maxLength={30000} rows={12} value={content} onChange={(e) => setContent(e.target.value)} /></label>
      {permissions.commercialUse ? (
        <label className="check-row"><input type="checkbox" checked={commercialIntent} onChange={(e) => setCommercialIntent(e.target.checked)} /> I intend to use this contribution commercially.</label>
      ) : <p className="field-note">Commercial use is not permitted for this work.</p>}
      <section className="permission-editor">
        <p className="eyebrow">CREATOR'S ADDITIONAL TERMS</p>
        <p>{permissions.additionalTerms || "No additional terms were provided."}</p>
        <p className="field-note">Permission version hash: <code>{permissionHash}</code></p>
        <label className="check-row"><input type="checkbox" required checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /> I have read and acknowledge the current permitted-use rules.</label>
      </section>
      <p className="field-note">Your submission is private and pending until the creator reviews it. Submission records are not yet anchored on Soneium.</p>
      <button className="primary-button" disabled={busy || !acknowledged}>{busy ? "Submitting…" : "Submit contribution"}</button>
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
    </form>
  );
}

export function ContributionReviewCard({
  contributionId,
  title,
  type,
  content,
  contributorName,
  contributorHandle,
  createdAt,
  status,
  feedback,
  decisionAnchor
}: {
  contributionId: string;
  title: string;
  type: string;
  content: string;
  contributorName: string | null;
  contributorHandle: string | null;
  createdAt: Date;
  status: "pending" | "approved" | "rejected" | "stale";
  feedback: string | null;
  decisionAnchor: {
    id: string;
    status: string;
    expectedSignerAddress: string;
    contractAddress: string;
    transactionHash: string | null;
    blockNumber: string | null;
  } | null;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reviewFeedback, setReviewFeedback] = useState(feedback ?? "");
  const [makePublic, setMakePublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/contributions/${contributionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, feedback: reviewFeedback, makePublic })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not record this decision.");
        router.refresh();
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
    <article className="contribution-card">
      <div className="contribution-card-head">
        <div><span className={`work-status ${status === "approved" ? "published" : status === "stale" ? "stale" : ""}`}>{status === "stale" ? "STALE · REVIEW DISABLED" : status}</span><h2>{title}</h2><p>By {contributorName ?? "Contributor"} · @{contributorHandle ?? "member"} · {type.replace("_", " ")}</p></div>
        <small>{createdAt.toLocaleDateString()}</small>
      </div>
      <div className="contribution-content">{content}</div>
      {status === "stale" ? <p className="stale-notice" role="status">This submission references an older story or permission version. It remains available as a historical record, but cannot be approved or rejected. Submit a new contribution against the current version.</p> : null}
      {status === "pending" ? (
        <div className="review-editor">
          <label>Decision<select value={decision} onChange={(e) => setDecision(e.target.value as "approve" | "reject")}><option value="approve">Approve</option><option value="reject">Reject</option></select></label>
          <label>Feedback (optional)<textarea rows={3} maxLength={2000} value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} /></label>
          {decision === "approve" ? <label className="check-row"><input type="checkbox" checked={makePublic} onChange={(e) => setMakePublic(e.target.checked)} /> Make this approved contribution public</label> : null}
          <button className="primary-button" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Record decision"}</button>
        </div>
      ) : feedback ? <p className="review-feedback">Creator feedback: {feedback}</p> : null}
      {status === "approved" || status === "rejected" ? (
        <CreatorDecisionProvenanceAction contributionId={contributionId} approved={status === "approved"} anchor={decisionAnchor} />
      ) : null}
      {error ? <p className="form-status error" role="alert">{error}</p> : null}
    </article>
  );
}