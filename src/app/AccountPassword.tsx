"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { tr, useLanguage } from "@/lib/language";

export default function AccountPassword() {
  const { language } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(""); setError("");
    if (password !== confirmation) { setError(tr(language, "Konfirmasi kata sandi tidak cocok.", "The password confirmation does not match.")); return; }
    const client = getSupabaseBrowser();
    if (!client) { setError(tr(language, "Supabase belum dikonfigurasi.", "Supabase is not configured.")); return; }
    setBusy(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(""); setConfirmation("");
      setNotice(tr(language, "Kata sandi tersimpan. Sekarang kamu bisa masuk ke PWA dengan email dan kata sandi ini.", "Password saved. You can now sign in to the PWA with your email and password."));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr(language, "Kata sandi belum tersimpan. Coba lagi.", "Password could not be saved. Try again."));
    } finally { setBusy(false); }
  }

  return <form className="account-form account-password" onSubmit={savePassword}>
    <h3>{tr(language, "Atur kata sandi", "Set a password")}</h3>
    <p>{tr(language, "Jika masuk lewat tautan email, buat kata sandi di sini untuk masuk langsung dari PWA.", "If you signed in through an email link, create a password here to sign in directly from the PWA.")}</p>
    <Field><FieldLabel htmlFor="new-account-password">{tr(language, "Kata sandi baru", "New password")}</FieldLabel><input id="new-account-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
    <Field><FieldLabel htmlFor="new-account-confirmation">{tr(language, "Ulangi kata sandi", "Confirm password")}</FieldLabel><input id="new-account-confirmation" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
    <button className="primary-button" type="submit" disabled={busy}>{busy ? tr(language, "Menyimpan...", "Saving...") : tr(language, "Simpan kata sandi", "Save password")}</button>
    {notice && <p className="form-notice" role="status">{notice}</p>}
    {error && <FieldError>{error}</FieldError>}
  </form>;
}
