"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type WorkStatus = { kind: "error" | "success"; message: string } | null;

export function NewWorkForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [body, setBody] = useState("");
  const [fanArt, setFanArt] = useState(true);
  const [translations, setTranslations] = useState(true);
  const [adaptations, setAdaptations] = useState(false);
  const [commercialUse, setCommercialUse] = useState(false);
  const [attributionRequired, setAttributionRequired] = useState(true);
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [status, setStatus] = useState<WorkStatus>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publish = submitter?.value === "publish";
    setBusy(true);
    setStatus(null);

    try {
      const response = await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          synopsis,
          body,
          permissions: {
            fanArt,
            translations,
            adaptations,
            commercialUse,
            attributionRequired,
            additionalTerms
          },
          publish
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus({ kind: "error", message: result.error ?? "Could not save this work." });
        return;
      }
      if (publish) {
        router.push(`/works/${result.work.slug}`);
      } else {
        setStatus({ kind: "success", message: "Draft saved to your Creator Studio." });
        router.push("/studio/works");
        router.refresh();
      }
    } catch {
      setStatus({ kind: "error", message: "The work service is unavailable. Try again shortly." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="work-form" onSubmit={submit}>
      <label>Story title<input required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Short synopsis<textarea required minLength={20} maxLength={500} rows={3} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} /></label>
      <label>Original work<textarea required minLength={100} maxLength={50000} rows={12} value={body} onChange={(e) => setBody(e.target.value)} /></label>
      <section className="permission-editor">
        <p className="eyebrow">PERMITTED USE</p>
        <p className="field-note">These rules describe what contributors may create from this work. They are stored with the published version.</p>
        <label className="check-row"><input type="checkbox" checked={fanArt} onChange={(e) => setFanArt(e.target.checked)} /> Fan art</label>
        <label className="check-row"><input type="checkbox" checked={translations} onChange={(e) => setTranslations(e.target.checked)} /> Translations</label>
        <label className="check-row"><input type="checkbox" checked={adaptations} onChange={(e) => setAdaptations(e.target.checked)} /> Adaptations and derivative stories</label>
        <label className="check-row"><input type="checkbox" checked={commercialUse} onChange={(e) => setCommercialUse(e.target.checked)} /> Commercial use</label>
        <label className="check-row"><input type="checkbox" checked={attributionRequired} onChange={(e) => setAttributionRequired(e.target.checked)} /> Attribution required</label>
        <label>Additional terms<textarea rows={3} maxLength={3000} value={additionalTerms} onChange={(e) => setAdditionalTerms(e.target.value)} placeholder="Optional conditions, credit format, or restrictions." /></label>
      </section>
      <p className="field-note">Publishing stores the work and permission hashes off-chain. It does not create a Soneium transaction or prove legal ownership.</p>
      <div className="work-form-actions">
        <button className="secondary-button" type="submit" value="draft" disabled={busy}>{busy ? "Saving…" : "Save draft"}</button>
        <button className="primary-button" type="submit" value="publish" disabled={busy}>{busy ? "Saving…" : "Publish work"}</button>
      </div>
      {status ? <p className={status.kind === "error" ? "form-status error" : "form-status success"} role="status">{status.message}</p> : null}
      <p className="auth-switch"><Link href="/studio/works">Back to your works</Link></p>
    </form>
  );
}