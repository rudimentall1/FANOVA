"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WorkPermissions } from "@/db/schema/content";

type WorkStatus = { kind: "error" | "success"; message: string } | null;
type WorkDraft = {
  title: string;
  synopsis: string;
  body: string;
  permissions: WorkPermissions;
};

export function NewWorkForm({ initial, slug }: { initial?: WorkDraft; slug?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [fanArt, setFanArt] = useState(initial?.permissions.fanArt ?? true);
  const [translations, setTranslations] = useState(initial?.permissions.translations ?? true);
  const [adaptations, setAdaptations] = useState(initial?.permissions.adaptations ?? false);
  const [commercialUse, setCommercialUse] = useState(initial?.permissions.commercialUse ?? false);
  const [attributionRequired, setAttributionRequired] = useState(initial?.permissions.attributionRequired ?? true);
  const [additionalTerms, setAdditionalTerms] = useState(initial?.permissions.additionalTerms ?? "");
  const [status, setStatus] = useState<WorkStatus>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publish = submitter?.value === "publish";
    setBusy(true);
    setStatus(null);

    try {
      const response = await fetch(slug ? `/api/works/${slug}` : "/api/works", {
        method: slug ? "PATCH" : "POST",
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
        <p className="field-note">These rules describe what contributors may create from this work. They are stored with each saved version.</p>
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