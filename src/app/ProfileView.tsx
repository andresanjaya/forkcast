"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CircleHelp, Settings2, Trash2, UserRound } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/food";
import { activeTarget, estimateTarget, profileError, validTarget, type TargetRecord, type TargetSource } from "@/lib/target";
import PwaUpdates from "./PwaUpdates";

type Props = {
  profile: Profile;
  targets: TargetRecord[];
  accountId: string | null;
  accountEmail: string;
  storageMode: "local" | "loading" | "account" | "error";
  supabaseConfigured: boolean;
  hasProfile: boolean;
  canImport: boolean;
  recoveryMode: boolean;
  onRecovered: () => void;
  onSaveProfile: (profile: Profile) => Promise<void>;
  onSaveTarget: (record: TargetRecord) => Promise<void>;
  onImport: () => Promise<void>;
  onRemoveAll: () => void;
};

const fmt = (value: number) => Math.round(value).toLocaleString("id-ID");
const dateTime = (value: string) => new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export default function ProfileView(props: Props) {
  const [draft, setDraft] = useState<Profile>(props.profile);
  const [targetDraft, setTargetDraft] = useState(props.profile.calorieTarget);
  const [targetSource, setTargetSource] = useState<TargetSource>("manual");
  const [targetNote, setTargetNote] = useState("");
  const [pendingTarget, setPendingTarget] = useState<TargetRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [targetNotice, setTargetNotice] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [authError, setAuthError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  useEffect(() => { setDraft(props.profile); }, [props.profile]);
  useEffect(() => { setTargetDraft(activeTarget(props.targets)?.calories ?? props.profile.calorieTarget); }, [props.targets, props.profile.calorieTarget]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(props.profile);
  const estimate = estimateTarget(draft);
  const active = activeTarget(props.targets);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileNotice("");
    const error = profileError(draft);
    if (error) { setProfileNotice(error); return; }
    setBusy(true);
    try { await props.onSaveProfile({ ...draft, name: draft.name.trim() }); setProfileNotice("Profil tersimpan. Target aktif tetap sama sampai kamu menyimpan target baru."); }
    catch { setProfileNotice("Profil belum tersimpan. Periksa koneksi dan coba lagi."); }
    finally { setBusy(false); }
  }

  async function saveTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTargetNotice("");
    if (!validTarget(targetDraft)) { setTargetNotice("Target harus bilangan bulat antara 1.000–6.000 kkal."); return; }
    if (targetNote.trim().length > 300) { setTargetNotice("Catatan maksimal 300 karakter."); return; }
    if (dirty || (props.accountId && !props.hasProfile)) { setTargetNotice("Simpan profil dahulu sebelum menyimpan target."); return; }
    const currentEstimate = estimateTarget(props.profile);
    if (targetSource === "calculated" && (!currentEstimate || targetDraft !== currentEstimate.calories)) {
      setTargetNotice("Estimasi sudah berubah. Pilih Gunakan perkiraan sekali lagi."); return;
    }
    const now = new Date().toISOString();
    const record: TargetRecord = pendingTarget && pendingTarget.calories === targetDraft && pendingTarget.source === targetSource && pendingTarget.note === targetNote.trim() && JSON.stringify(pendingTarget.inputs) === JSON.stringify(targetSource === "calculated" ? currentEstimate?.inputs ?? null : null) ? pendingTarget : {
      id: crypto.randomUUID(), calories: targetDraft, source: targetSource,
      formulaVersion: targetSource === "calculated" ? currentEstimate?.formulaVersion ?? null : null,
      inputs: targetSource === "calculated" ? currentEstimate?.inputs ?? null : null,
      effectiveAt: now, createdAt: now, note: targetNote.trim(),
    };
    setPendingTarget(record);
    setBusy(true);
    try { await props.onSaveTarget(record); setPendingTarget(null); setTargetNote(""); setTargetNotice("Target baru aktif dan tercatat di riwayat."); }
    catch { setTargetNotice("Target belum tersimpan. Periksa koneksi dan coba lagi."); }
    finally { setBusy(false); }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError(""); setAuthNotice("");
    const client = getSupabaseBrowser();
    if (!client) { setAuthError("Supabase belum dikonfigurasi."); return; }
    if (props.recoveryMode || authMode === "signup") {
      if (password.length < 6) { setAuthError("Kata sandi minimal 6 karakter."); return; }
      if (password !== confirmPassword) { setAuthError("Konfirmasi kata sandi tidak cocok."); return; }
    }
    setAuthBusy(true);
    try {
      if (props.recoveryMode) {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        props.onRecovered(); setAuthNotice("Kata sandi berhasil diganti."); setPassword(""); setConfirmPassword("");
      } else if (authMode === "signup") {
        const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setAuthNotice(data.session ? "Akun dibuat dan kamu sudah masuk." : "Periksa email untuk mengonfirmasi akun, lalu masuk.");
        setPassword(""); setConfirmPassword("");
      } else if (authMode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setAuthNotice("Jika alamat terdaftar, tautan pemulihan telah dikirim.");
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setAuthNotice("Berhasil masuk."); setPassword("");
      }
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Permintaan belum berhasil. Coba lagi."); }
    finally { setAuthBusy(false); }
  }

  async function magicLink() {
    setAuthError(""); setAuthNotice("");
    if (!email.trim()) { setAuthError("Isi email terlebih dahulu."); return; }
    const client = getSupabaseBrowser(); if (!client) return;
    setAuthBusy(true);
    const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setAuthBusy(false);
    setAuthNotice(error ? "" : "Tautan masuk telah dikirim. Periksa emailmu.");
    setAuthError(error?.message ?? "");
  }

  async function signOut() {
    const client = getSupabaseBrowser(); if (!client) return;
    setAuthBusy(true); setAuthError("");
    const { error } = await client.auth.signOut();
    if (error) setAuthError(error.message);
    setAuthBusy(false);
  }

  return <>
    <div className="page-intro"><span className="eyebrow">TENTANG KAMU</span><h1>Profil & target</h1><p>Sesuaikan perkiraan dengan kebutuhan dan kenyamananmu.</p></div>
    <div className="profile-grid">
      <section className="panel">
        <div className="card-top"><div><span className="card-kicker">DATA DASAR</span><h2>Profilmu</h2></div><span className="card-soft-icon"><UserRound size={19} /></span></div>
        <form onSubmit={saveProfile}>
          <div className="form-grid">
            <label className="field">Nama panggilan (opsional)<input value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Panggilanmu" /></label>
            <label className="field">Usia<input type="number" min="18" max="120" value={draft.age || ""} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })} required /></label>
            <label className="field">Tinggi (cm)<input type="number" min="100" max="250" step="0.1" value={draft.height || ""} onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) })} required /></label>
            <label className="field">Berat (kg)<input type="number" min="20" max="400" step="0.1" value={draft.weight || ""} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} required /></label>
            <label className="field">Parameter rumus dasar<select value={draft.sex} onChange={(e) => setDraft({ ...draft, sex: e.target.value as Profile["sex"] })}><option value="tidak_menyebutkan">Tidak ingin menyebutkan</option><option value="wanita">Koefisien wanita</option><option value="pria">Koefisien pria</option></select></label>
            <label className="field">Aktivitas<select value={draft.activity} onChange={(e) => setDraft({ ...draft, activity: e.target.value as Profile["activity"] })}><option value="rendah">Rendah · banyak duduk</option><option value="ringan">Ringan · bergerak sesekali</option><option value="sedang">Sedang · aktif rutin</option><option value="tinggi">Tinggi · sangat aktif</option></select></label>
            <label className="field">Tujuan<select value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value as Profile["goal"] })}><option value="turun">Turun berat</option><option value="jaga">Jaga berat</option><option value="naik">Naik berat</option></select></label>
          </div>
          <p className="microcopy">Satuan metrik (cm, kg) · Bahasa Indonesia (id-ID). Angka target aktif tidak berubah saat profil diubah.</p>
          <div className="profile-actions"><button className="primary-button" type="submit" disabled={busy || props.storageMode === "loading" || props.storageMode === "error"}>{busy ? "Menyimpan..." : "Simpan profil"}</button><button className="outline-button" type="button" disabled={!dirty || busy} onClick={() => { setDraft(props.profile); setProfileNotice(""); }}>Batal</button></div>
          {profileNotice && <p className="form-notice" role="status">{profileNotice}</p>}
        </form>
      </section>
      <section className="panel target-panel">
        <div className="card-top"><div><span className="card-kicker">PANDUAN HARIAN</span><h2>Target kalorimu</h2></div><span className="card-soft-icon"><Settings2 size={19} /></span></div>
        <div className="suggested-target"><span>Target aktif</span><strong>{fmt(active?.calories ?? props.profile.calorieTarget)} <small>kkal/hari</small></strong></div>
        <div className="suggested-target"><span>Perkiraan dari profil {dirty ? "(belum disimpan)" : ""}</span><strong>{estimate ? fmt(estimate.calories) : "Tidak tersedia"} {estimate && <small>kkal/hari</small>}</strong></div>
        {!estimate && <p className="microcopy">Pilih koefisien rumus untuk perkiraan otomatis, atau isi target manual.</p>}
        <form onSubmit={saveTarget}>
          <label className="field">Target pilihanmu (kkal/hari)<input type="number" min="1000" max="6000" step="1" value={targetDraft || ""} onChange={(e) => { setTargetDraft(Number(e.target.value)); setTargetSource("manual"); }} required /></label>
          <label className="field">Catatan (opsional)<input maxLength={300} value={targetNote} onChange={(e) => setTargetNote(e.target.value)} placeholder="Alasan perubahan target" /></label>
          {estimate && <button className="text-button" type="button" onClick={() => { setTargetDraft(estimate.calories); setTargetSource("calculated"); }}>Gunakan perkiraan <ArrowRight size={16} /></button>}
          <p className="microcopy">Sumber: {targetSource === "calculated" ? "perkiraan dari rumus" : "diisi manual"}. Tinjau angkanya sebelum menyimpan.</p>
          <button className="primary-button" type="submit" disabled={busy || props.storageMode === "loading" || props.storageMode === "error"}>{busy ? "Menyimpan..." : "Simpan target baru"}</button>
          {targetNotice && <p className="form-notice" role="status">{targetNotice}</p>}
        </form>
        <div className="formula-note"><CircleHelp size={18} /><p>Perkiraan memakai Mifflin–St Jeor, faktor aktivitas 1,2–1,65, dan penyesuaian tujuan −300/0/+250 kkal. Ini bukan saran medis.</p></div>
      </section>
    </div>
    <section className="panel target-history"><span className="card-kicker">RIWAYAT TARGET</span><h2>Perubahan target</h2>
      {props.targets.length ? <ol>{props.targets.map((record) => <li key={record.id}><div><strong>{fmt(record.calories)} kkal/hari</strong><span>{record.source === "calculated" ? "Dari rumus" : "Manual"} · berlaku {dateTime(record.effectiveAt)}</span>{record.note && <small>{record.note}</small>}{record.inputs && <small>Usia {record.inputs.age} · {record.inputs.weight} kg · {record.inputs.height} cm · {record.inputs.activity} · {record.inputs.goal} · {record.formulaVersion}</small>}</div></li>)}</ol> : <p className="microcopy">Belum ada riwayat. Simpan target pertama untuk mulai mencatat perubahan.</p>}
    </section>
    <section className="panel account-panel"><span className="card-kicker">AKUN</span><h2>{props.accountId ? "Tersambung ke Supabase" : "Simpan lintas perangkat"}</h2>
      {props.recoveryMode ? <form className="account-form" onSubmit={submitAuth}><p>Buat kata sandi baru untuk akunmu.</p><input type="password" minLength={6} required placeholder="Kata sandi baru" value={password} onChange={(e) => setPassword(e.target.value)} /><input type="password" minLength={6} required placeholder="Ulangi kata sandi" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /><button className="primary-button" disabled={authBusy}>{authBusy ? "Menyimpan..." : "Ganti kata sandi"}</button></form>
      : props.accountId ? <><p>{props.accountEmail}</p><button className="outline-button" disabled={authBusy} onClick={signOut}>{authBusy ? "Keluar..." : "Keluar dari akun"}</button>{props.canImport && <div className="import-demo"><p>Ada catatan demo di perangkat ini. Impor profil dan makanan ke akun sekali saja; data demo tetap tersimpan.</p><button className="outline-button" disabled={importBusy} onClick={async () => { setImportBusy(true); setAuthError(""); try { await props.onImport(); setAuthNotice("Data demo berhasil diimpor."); } catch { setAuthError("Impor belum selesai. Coba lagi; catatan yang sudah masuk tidak akan digandakan."); } finally { setImportBusy(false); } }}>{importBusy ? "Mengimpor..." : "Impor data demo"}</button></div>}</>
      : props.supabaseConfigured ? <><div className="auth-tabs"><button className={authMode === "signin" ? "active" : ""} onClick={() => { setAuthMode("signin"); setAuthError(""); }}>Masuk</button><button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthError(""); }}>Daftar</button><button className={authMode === "reset" ? "active" : ""} onClick={() => { setAuthMode("reset"); setAuthError(""); }}>Lupa sandi</button></div><form className="account-form" onSubmit={submitAuth}><p>Catatan demo di perangkat ini tetap terpisah dari akun.</p><input type="email" required placeholder="Email kamu" value={email} onChange={(e) => setEmail(e.target.value)} />{authMode !== "reset" && <input type="password" required minLength={6} placeholder="Kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} />}{authMode === "signup" && <input type="password" required minLength={6} placeholder="Ulangi kata sandi" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />}<button className="primary-button" disabled={authBusy}>{authBusy ? "Memproses..." : authMode === "signup" ? "Buat akun" : authMode === "reset" ? "Kirim tautan pemulihan" : "Masuk"}</button></form>{authMode === "signin" && <button className="text-button" disabled={authBusy} onClick={magicLink}>Atau kirim tautan masuk lewat email</button>}</>
      : <p>Mode demo aktif. Tambahkan URL proyek dan publishable key ke .env.local untuk mengaktifkan akun.</p>}
      {authNotice && <p className="form-notice" role="status">{authNotice}</p>}{authError && <p className="error-message" role="alert">{authError}</p>}
    </section>
    <section className="panel privacy-panel"><div><span className="card-kicker">DATA & PRIVASI</span><h2>{props.accountId ? "Data akun" : "Mode demo lokal"}</h2><p>{props.accountId ? "Catatan akunmu disimpan di Supabase. Foto tidak disimpan." : "Catatan demo berada di penyimpanan browser perangkat ini. Foto tidak disimpan."}</p><p>Untuk memasang Porsi: di iPhone gunakan Bagikan → Tambahkan ke Layar Utama; di Android pilih Instal aplikasi pada menu browser.</p></div><button className="outline-button danger-text" onClick={props.onRemoveAll}><Trash2 size={17} /> {props.accountId ? "Hapus data akun" : "Hapus semua data"}</button></section>
    <PwaUpdates />
  </>;
}
