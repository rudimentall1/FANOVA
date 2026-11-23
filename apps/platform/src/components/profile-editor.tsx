"use client";

import { useState, type FormEvent } from "react";

type ProfileValues = {
  handle: string;
  displayName: string;
  bio: string;
  isPublic: boolean;
};

export function ProfileEditor({ initialProfile }: { initialProfile: ProfileValues }) {
  const [values, setValues] = useState(initialProfile);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Profile could not be saved.");
        return;
      }
      setValues({
        handle: result.profile.handle,
        displayName: result.profile.displayName,
        bio: result.profile.bio ?? "",
        isPublic: result.profile.isPublic
      });
      setMessage("Profile saved.");
    } catch {
      setMessage("Network error. Your profile was not saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="account-panel">
      <div>
        <p className="eyebrow">PUBLIC PROFILE</p>
        <h2>Edit your creator profile</h2>
        <p className="field-note">Your handle is your public profile URL. Keep your bio focused on your work and creative interests.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="profile-handle">Public handle</label>
        <input id="profile-handle" value={values.handle} minLength={3} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]" required onChange={(event) => setValues({ ...values, handle: event.target.value })} />
        <label htmlFor="profile-display-name">Display name</label>
        <input id="profile-display-name" value={values.displayName} minLength={2} maxLength={60} required onChange={(event) => setValues({ ...values, displayName: event.target.value })} />
        <label htmlFor="profile-bio">Bio</label>
        <textarea id="profile-bio" value={values.bio} maxLength={500} rows={4} onChange={(event) => setValues({ ...values, bio: event.target.value })} />
        <label className="checkbox-row">
          <input type="checkbox" checked={values.isPublic} onChange={(event) => setValues({ ...values, isPublic: event.target.checked })} />
          Show my profile publicly
        </label>
        <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        {message ? <p className="field-note" role="status" aria-live="polite">{message}</p> : null}
      </form>
      {values.isPublic ? <p className="field-note">Public URL: <a href={`/creators/${values.handle.toLowerCase()}`}>/creators/{values.handle.toLowerCase()}</a></p> : <p className="field-note">Your public profile is hidden. Published works remain available in Discover.</p>}
    </section>
  );
}
