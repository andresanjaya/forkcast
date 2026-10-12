"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export default function AccountPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(""); setError("");
    if (password !== confirmation) { setError("Konfirmasi kata sandi tidak cocok."); return; }
    const client = getSupabaseBrowser();
    if (!client) { setError("Supabase belum dikonfigurasi."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(""); setConfirmation("");
      setNotice("Kata sandi tersimpan. Sekarang kamu bisa masuk ke PWA dengan email dan kata sandi ini.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kata sandi belum tersimpan. Coba lagi.");
    } finally { setBusy(false); }
  }

  return <form className="account-form account-password" onSubmit={savePassword}>
    <h3>Atur kata sandi</h3>
    <p>Jika masuk lewat tautan email, buat kata sandi di sini untuk masuk langsung dari PWA.</p>
    <input type="password" autoComplete="new-password" minLength={8} required placeholder="Kata sandi baru" value={password} onChange={(event) => setPassword(event.target.value)} />
    <input type="password" autoComplete="new-password" minLength={8} required placeholder="Ulangi kata sandi" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
    <button className="primary-button" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan kata sandi"}</button>
    {notice && <p className="form-notice" role="status">{notice}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
  </form>;
}
