"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Languages, Scale, Settings2, ShieldCheck, Target, Trash2, UserRound } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { Profile, WeightEntry } from "@/lib/food";
import { activeTarget, profileError, validTarget, type TargetRecord, type TargetSource } from "@/lib/target";
import PwaUpdates from "./PwaUpdates";
import AccountPassword from "./AccountPassword";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tr, type AppLanguage } from "@/lib/language";
import { estimateNutritionGoals, validMacroTargets, type MacroTargets } from "@/lib/target";

type Props = {
  initialSection?: "overview" | "account";
  profile: Profile;
  targets: TargetRecord[];
  weights: WeightEntry[];
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
  onOpenProgress: () => void;
  onDirtyChange: (dirty: boolean) => void;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => Promise<void>;
};

type ProfileSection = "overview" | "basic" | "target" | "weight" | "updates" | "account";


export default function ProfileView(props: Props) {
  const fmt = (value: number) => Math.round(value).toLocaleString(props.language);
  const [draft, setDraft] = useState<Profile>(props.profile);
  const [targetDraft, setTargetDraft] = useState(props.profile.calorieTarget);
  const [macroDraft, setMacroDraft] = useState<MacroTargets>({ protein: Math.round(props.profile.weight * 1.2), carbs: Math.round(props.profile.calorieTarget * .5 / 4), fat: Math.round(props.profile.calorieTarget * .3 / 9) });
  const [gainKg, setGainKg] = useState(3);
  const [gainWeeks, setGainWeeks] = useState(12);
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
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageBusy, setLanguageBusy] = useState(false);
  const [languageError, setLanguageError] = useState("");
  const allowConfirmedReload = useRef(false);
  const [section, setSection] = useState<ProfileSection>(props.recoveryMode ? "account" : props.initialSection ?? "overview");
  useEffect(() => { setDraft(props.profile); }, [props.profile]);
  useEffect(() => { const current = activeTarget(props.targets); setTargetDraft(current?.calories ?? props.profile.calorieTarget); setMacroDraft(current?.macros ?? { protein: Math.round(props.profile.weight * 1.2), carbs: Math.round((current?.calories ?? props.profile.calorieTarget) * .5 / 4), fat: Math.round((current?.calories ?? props.profile.calorieTarget) * .3 / 9) }); }, [props.targets, props.profile.calorieTarget, props.profile.weight]);
  useEffect(() => { if (props.recoveryMode) setSection("account"); }, [props.recoveryMode]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(props.profile);
  const estimate = estimateNutritionGoals(draft, gainKg, gainWeeks);
  const active = activeTarget(props.targets);
  const targetDirty = targetDraft !== (active?.calories ?? props.profile.calorieTarget) || JSON.stringify(macroDraft) !== JSON.stringify(active?.macros ?? { protein: Math.round(props.profile.weight * 1.2), carbs: Math.round((active?.calories ?? props.profile.calorieTarget) * .5 / 4), fat: Math.round((active?.calories ?? props.profile.calorieTarget) * .3 / 9) }) || targetNote.trim().length > 0 || targetSource !== "manual";
  const latestWeight = [...props.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  const onDirtyChange = props.onDirtyChange;
  useEffect(() => { onDirtyChange(dirty || targetDirty); }, [dirty, targetDirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty && !targetDirty) return;
    const warn = (event: BeforeUnloadEvent) => { if (allowConfirmedReload.current) return; event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, targetDirty]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileNotice("");
    const error = profileError(draft, props.language);
    if (error) { setProfileNotice(error); return; }
    setBusy(true);
    try { await props.onSaveProfile({ ...draft, name: draft.name.trim() }); setProfileNotice(tr(props.language, "Profil tersimpan. Target aktif tetap sama sampai kamu menyimpan target baru.", "Profile saved. Active goals remain unchanged until you save new goals.")); }
    catch { setProfileNotice(tr(props.language, "Profil belum tersimpan. Periksa koneksi dan coba lagi.", "Profile could not be saved. Check your connection and try again.")); }
    finally { setBusy(false); }
  }

  async function saveTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTargetNotice("");
    if (!validTarget(targetDraft)) { setTargetNotice(tr(props.language, "Target harus bilangan bulat antara 1.000–6.000 kkal.", "The calorie goal must be a whole number between 1,000 and 6,000 kcal.")); return; }
    if (!validMacroTargets(macroDraft)) { setTargetNotice(tr(props.language, "Target protein, karbohidrat, dan lemak harus bilangan bulat 0–1.000 gram.", "Protein, carbohydrate, and fat goals must be whole numbers between 0 and 1,000 grams.")); return; }
    if (targetNote.trim().length > 300) { setTargetNotice(tr(props.language, "Catatan maksimal 300 karakter.", "The note can contain up to 300 characters.")); return; }
    if (dirty || (props.accountId && !props.hasProfile)) { setTargetNotice(tr(props.language, "Simpan profil dahulu sebelum menyimpan target.", "Save your profile before saving goals.")); return; }
    const currentEstimate = estimateNutritionGoals(props.profile, gainKg, gainWeeks);
    if (targetSource === "calculated" && (!currentEstimate || targetDraft !== currentEstimate.calories || JSON.stringify(macroDraft) !== JSON.stringify(currentEstimate.macros))) {
      setTargetNotice(tr(props.language, "Estimasi sudah berubah. Buat rekomendasi sekali lagi.", "The estimate has changed. Generate the recommendation again.")); return;
    }
    const now = new Date().toISOString();
    const record: TargetRecord = pendingTarget && pendingTarget.calories === targetDraft && pendingTarget.source === targetSource && pendingTarget.note === targetNote.trim() && JSON.stringify(pendingTarget.macros) === JSON.stringify(macroDraft) && JSON.stringify(pendingTarget.inputs) === JSON.stringify(targetSource === "calculated" ? currentEstimate?.inputs ?? null : null) ? pendingTarget : {
      id: crypto.randomUUID(), calories: targetDraft, source: targetSource,
      formulaVersion: targetSource === "calculated" ? currentEstimate?.formulaVersion ?? null : null,
      inputs: targetSource === "calculated" ? currentEstimate?.inputs ?? null : null,
      effectiveAt: now, createdAt: now, note: targetNote.trim(), macros: { ...macroDraft },
    };
    setPendingTarget(record);
    setBusy(true);
    try { await props.onSaveTarget(record); setPendingTarget(null); setTargetNote(""); setTargetSource("manual"); setTargetNotice(tr(props.language, "Target baru aktif dan tercatat di riwayat.", "New goals are active and recorded in your history.")); }
    catch { setTargetNotice(tr(props.language, "Target belum tersimpan. Periksa koneksi dan coba lagi.", "Goals could not be saved. Check your connection and try again.")); }
    finally { setBusy(false); }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError(""); setAuthNotice("");
    const client = getSupabaseBrowser();
    if (!client) { setAuthError(tr(props.language, "Supabase belum dikonfigurasi.", "Supabase is not configured.")); return; }
    if (props.recoveryMode || authMode === "signup") {
      if (password.length < 6) { setAuthError(tr(props.language, "Kata sandi minimal 6 karakter.", "The password must contain at least 6 characters.")); return; }
      if (password !== confirmPassword) { setAuthError(tr(props.language, "Konfirmasi kata sandi tidak cocok.", "The password confirmation does not match.")); return; }
    }
    setAuthBusy(true);
    try {
      if (props.recoveryMode) {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        props.onRecovered(); setAuthNotice(tr(props.language, "Kata sandi berhasil diganti.", "Password changed.")); setPassword(""); setConfirmPassword("");
      } else if (authMode === "signup") {
        const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/` } });
        if (error) throw error;
        setAuthNotice(data.session ? tr(props.language, "Akun dibuat dan kamu sudah masuk.", "Account created and signed in.") : tr(props.language, "Periksa email untuk mengonfirmasi akun, lalu masuk.", "Check your email to confirm your account, then sign in."));
        setPassword(""); setConfirmPassword("");
      } else if (authMode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` });
        if (error) throw error;
        setAuthNotice(tr(props.language, "Jika alamat terdaftar, tautan pemulihan telah dikirim.", "If the address is registered, a recovery link has been sent."));
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setAuthNotice(tr(props.language, "Berhasil masuk.", "Signed in.")); setPassword("");
      }
    } catch (error) { setAuthError(error instanceof Error ? error.message : tr(props.language, "Permintaan belum berhasil. Coba lagi.", "The request failed. Try again.")); }
    finally { setAuthBusy(false); }
  }

  async function magicLink() {
    setAuthError(""); setAuthNotice("");
    if (!email.trim()) { setAuthError(tr(props.language, "Isi email terlebih dahulu.", "Enter your email first.")); return; }
    const client = getSupabaseBrowser(); if (!client) return;
    setAuthBusy(true);
    const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/` } });
    setAuthBusy(false);
    setAuthNotice(error ? "" : tr(props.language, "Tautan masuk telah dikirim. Periksa emailmu.", "Sign-in link sent. Check your email."));
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
    <div className="page-intro profile-intro">
      {section !== "overview" && <button className="outline-button" type="button" onClick={() => { if ((dirty || targetDirty) && !window.confirm(tr(props.language, "Perubahan belum disimpan. Kembali dan batalkan perubahan?", "Unsaved changes. Go back and discard them?"))) return; setDraft(props.profile); setTargetDraft(active?.calories ?? props.profile.calorieTarget); setMacroDraft(active?.macros ?? { protein: Math.round(props.profile.weight * 1.2), carbs: Math.round((active?.calories ?? props.profile.calorieTarget) * .5 / 4), fat: Math.round((active?.calories ?? props.profile.calorieTarget) * .3 / 9) }); setTargetNote(""); setTargetSource("manual"); setSection("overview"); }}><ArrowLeft size={16} /> {tr(props.language, "Kembali ke Profil", "Back to Profile")}</button>}
      <span className="eyebrow">{tr(props.language, "TENTANG KAMU", "ABOUT YOU")}</span>
      <h1>{section === "overview" ? tr(props.language, "Profil", "Profile") : section === "basic" ? tr(props.language, "Data dasar", "Basic details") : section === "target" ? tr(props.language, "Target nutrisi", "Nutrition goals") : section === "weight" ? tr(props.language, "Riwayat berat", "Weight history") : section === "updates" ? tr(props.language, "Pembaruan aplikasi", "App updates") : tr(props.language, "Akun & privasi", "Account & privacy")}</h1>
      <p>{section === "overview" ? tr(props.language, "Pilih bagian yang ingin kamu lihat atau ubah.", "Choose what you want to view or edit.") : tr(props.language, "Perubahan disimpan saat kamu menekan tombol simpan.", "Changes are saved when you press Save.")}</p>
    </div>
    {section === "overview" && <div className="profile-menu">
      <button className="profile-menu-card" type="button" onClick={() => setSection("basic")}><span className="fc-profile-icon"><UserRound size={22} /></span><span className="card-kicker">{tr(props.language, "PROFIL", "PROFILE")}</span><strong>{tr(props.language, "Data dasar", "Basic details")}</strong><small>{props.profile.age || "—"} {tr(props.language, "tahun", "years")} · {props.profile.height || "—"} cm · {(latestWeight?.weight ?? props.profile.weight) || "—"} kg</small><span className="profile-menu-link">{tr(props.language, "Lihat data dasar", "View details")} <ArrowRight size={15} /></span></button>
      <button className="profile-menu-card" type="button" onClick={() => setSection("target")}><span className="fc-profile-icon"><Target size={22} /></span><span className="card-kicker">{tr(props.language, "PANDUAN HARIAN", "DAILY GUIDE")}</span><strong>{tr(props.language, "Target nutrisi", "Nutrition goals")}</strong><small>{fmt(active?.calories ?? props.profile.calorieTarget)} {tr(props.language, "kkal/hari", "kcal/day")} · {active?.source === "calculated" ? tr(props.language, "Dari rumus", "Estimated") : tr(props.language, "Manual", "Manual")}</small><span className="profile-menu-link">{tr(props.language, "Lihat target & riwayat", "View goals & history")} <ArrowRight size={15} /></span></button>
      <button className="profile-menu-card" type="button" onClick={() => setSection("weight")}><span className="fc-profile-icon"><Scale size={22} /></span><span className="card-kicker">{tr(props.language, "PROGRES", "PROGRESS")}</span><strong>{tr(props.language, "Riwayat berat", "Weight history")}</strong><small>{latestWeight ? `${latestWeight.weight} kg · ${new Date(`${latestWeight.date}T12:00:00`).toLocaleDateString(props.language, { dateStyle: "medium" })}` : tr(props.language, "Belum ada catatan berat", "No weight entries yet")}</small><span className="profile-menu-link">{tr(props.language, "Lihat riwayat berat", "View weight history")} <ArrowRight size={15} /></span></button>
      <button className="profile-menu-card" type="button" onClick={() => setSection("account")}><span className="fc-profile-icon"><ShieldCheck size={22} /></span><span className="card-kicker">{tr(props.language, "PENGATURAN", "SETTINGS")}</span><strong>{tr(props.language, "Akun & privasi", "Account & privacy")}</strong><small>{props.accountId ? props.accountEmail : tr(props.language, "Mode demo di perangkat ini", "Demo mode on this device")}</small><span className="profile-menu-link">{tr(props.language, "Lihat pengaturan", "View settings")} <ArrowRight size={15} /></span></button>
      <button className="profile-menu-card" type="button" onClick={() => setLanguageOpen(true)}><span className="fc-profile-icon"><Languages size={22} /></span><span className="card-kicker">{tr(props.language, "PENGATURAN", "SETTINGS")}</span><strong>{tr(props.language, "Bahasa", "Language")}</strong><small>{props.language === "id-ID" ? "Bahasa Indonesia" : "English"}</small><span className="profile-menu-link"><ArrowRight size={15} /></span></button>
    </div>}
    <Sheet open={languageOpen} onOpenChange={setLanguageOpen}><SheetContent side="bottom" className="fc-language-sheet"><SheetHeader><SheetTitle>{tr(props.language, "Pilih bahasa", "Select language")}</SheetTitle></SheetHeader><div role="group" aria-label={tr(props.language, "Bahasa aplikasi", "App language")}>{(["id-ID", "en-US"] as const).map((option) => <button key={option} type="button" aria-pressed={props.language === option} disabled={languageBusy} onClick={async () => { setLanguageBusy(true); setLanguageError(""); try { await props.onLanguageChange(option); setLanguageOpen(false); } catch { setLanguageError(tr(props.language, "Bahasa belum tersimpan. Coba lagi.", "Language could not be saved. Try again.")); } finally { setLanguageBusy(false); } }}><span>{option === "id-ID" ? "🇮🇩" : "🇺🇸"}</span><strong>{option === "id-ID" ? "Bahasa Indonesia" : "English"}</strong>{props.language === option && <Check size={20} />}</button>)}</div>{languageError && <FieldError>{languageError}</FieldError>}</SheetContent></Sheet>
    <div className="profile-grid profile-detail-grid" hidden={section !== "basic" && section !== "target"}>
      <section className="panel" hidden={section !== "basic"}>
        <div className="card-top"><div><span className="card-kicker">{tr(props.language, "DATA DASAR", "BASIC DETAILS")}</span><h2>{tr(props.language, "Profilmu", "Your profile")}</h2></div><span className="card-soft-icon"><UserRound size={19} /></span></div>
        <form onSubmit={saveProfile}>
          <div className="form-grid">
            <Field><FieldLabel htmlFor="profile-name">{tr(props.language, "Nama panggilan (opsional)", "Display name (optional)")}</FieldLabel><input id="profile-name" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={tr(props.language, "Panggilanmu", "Your name")} /></Field>
            <Field><FieldLabel htmlFor="profile-age">{tr(props.language, "Usia", "Age")}</FieldLabel><input id="profile-age" type="number" min="18" max="120" value={draft.age || ""} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })} required /></Field>
            <Field><FieldLabel htmlFor="profile-height">{tr(props.language, "Tinggi (cm)", "Height (cm)")}</FieldLabel><input id="profile-height" type="number" min="100" max="250" step="0.1" value={draft.height || ""} onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) })} required /></Field>
            <Field><FieldLabel htmlFor="profile-weight">{tr(props.language, "Berat (kg)", "Weight (kg)")}</FieldLabel><input id="profile-weight" type="number" min="20" max="400" step="0.1" value={draft.weight || ""} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} required /></Field>
            <Field><FieldLabel htmlFor="profile-sex">{tr(props.language, "Parameter rumus dasar", "Formula parameter")}</FieldLabel><select id="profile-sex" value={draft.sex} onChange={(e) => setDraft({ ...draft, sex: e.target.value as Profile["sex"] })}><option value="tidak_menyebutkan">{tr(props.language, "Tidak ingin menyebutkan", "Prefer not to say")}</option><option value="wanita">{tr(props.language, "Koefisien wanita", "Female coefficient")}</option><option value="pria">{tr(props.language, "Koefisien pria", "Male coefficient")}</option></select></Field>
            <Field><FieldLabel htmlFor="profile-activity">{tr(props.language, "Aktivitas", "Activity")}</FieldLabel><select id="profile-activity" value={draft.activity} onChange={(e) => setDraft({ ...draft, activity: e.target.value as Profile["activity"] })}><option value="rendah">{tr(props.language, "Rendah · banyak duduk", "Low · mostly sitting")}</option><option value="ringan">{tr(props.language, "Ringan · bergerak sesekali", "Light · occasional movement")}</option><option value="sedang">{tr(props.language, "Sedang · aktif rutin", "Moderate · regularly active")}</option><option value="tinggi">{tr(props.language, "Tinggi · sangat aktif", "High · very active")}</option></select></Field>
            <Field><FieldLabel htmlFor="profile-goal">{tr(props.language, "Tujuan", "Goal")}</FieldLabel><select id="profile-goal" value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value as Profile["goal"] })}><option value="turun">{tr(props.language, "Turun berat", "Lose weight")}</option><option value="jaga">{tr(props.language, "Jaga berat", "Maintain weight")}</option><option value="naik">{tr(props.language, "Naik berat", "Gain weight")}</option></select></Field>
          </div>
          <p className="microcopy">{tr(props.language, "Satuan metrik (cm, kg). Target aktif tidak berubah saat profil diubah.", "Metric units (cm, kg). Active goals stay unchanged when the profile changes.")}</p>
          <div className="profile-actions"><button className="primary-button" type="submit" disabled={busy || props.storageMode === "loading" || props.storageMode === "error"}>{busy ? tr(props.language, "Menyimpan...", "Saving...") : tr(props.language, "Simpan profil", "Save profile")}</button><button className="outline-button" type="button" disabled={!dirty || busy} onClick={() => { setDraft(props.profile); setProfileNotice(""); }}>{tr(props.language, "Batal", "Cancel")}</button></div>
          {profileNotice && <p className="form-notice" role="status">{profileNotice}</p>}
        </form>
      </section>
      <section className="panel target-panel" hidden={section !== "target"}>
        <div className="card-top"><div><span className="fc-profile-icon"><Target size={22} /></span><span className="card-kicker">{tr(props.language, "PANDUAN HARIAN", "DAILY GUIDE")}</span><h2>{tr(props.language, "Target nutrisimu", "Your nutrition goals")}</h2></div><span className="card-soft-icon"><Settings2 size={19} /></span></div>
        <div className="suggested-target"><span>{tr(props.language, "Target aktif", "Active goals")}</span><strong>{fmt(active?.calories ?? props.profile.calorieTarget)} <small>{tr(props.language, "kkal/hari", "kcal/day")}</small></strong>{active?.macros && <p>Protein {active.macros.protein} g · {tr(props.language, "Karbo", "Carbs")} {active.macros.carbs} g · {tr(props.language, "Lemak", "Fat")} {active.macros.fat} g</p>}</div>
        <FieldGroup className="fc-goal-inputs">
          <Field><FieldLabel htmlFor="goal-gain-kg">{tr(props.language, "Target kenaikan berat (kg)", "Weight gain goal (kg)")}</FieldLabel><input id="goal-gain-kg" type="number" min="0" max="30" step="0.1" value={gainKg} onChange={(e) => setGainKg(Number(e.target.value))} disabled={draft.goal !== "naik"} /><FieldDescription>{tr(props.language, "Dipakai hanya jika tujuan profil adalah naik berat.", "Used only when your profile goal is to gain weight.")}</FieldDescription></Field>
          <Field><FieldLabel htmlFor="goal-gain-weeks">{tr(props.language, "Rentang waktu (minggu)", "Time frame (weeks)")}</FieldLabel><input id="goal-gain-weeks" type="number" min="1" max="104" step="1" value={gainWeeks} onChange={(e) => setGainWeeks(Number(e.target.value))} disabled={draft.goal !== "naik"} /></Field>
        </FieldGroup>
        <div className="suggested-target"><span>{tr(props.language, "Perkiraan dari profil", "Estimate from profile")} {dirty ? tr(props.language, "(belum disimpan)", "(unsaved)") : ""}</span><strong>{estimate ? fmt(estimate.calories) : tr(props.language, "Tidak tersedia", "Unavailable")} {estimate && <small>{tr(props.language, "kkal/hari", "kcal/day")}</small>}</strong>{estimate && <p>Protein {estimate.macros.protein} g · {tr(props.language, "Karbo", "Carbs")} {estimate.macros.carbs} g · {tr(props.language, "Lemak", "Fat")} {estimate.macros.fat} g</p>}</div>
        {!estimate && <p className="microcopy">{tr(props.language, "Lengkapi profil dan pilih parameter rumus dasar sebelum membuat rekomendasi otomatis.", "Complete your profile and choose a formula parameter before generating a recommendation.")}</p>}
        <form onSubmit={saveTarget}>
          <FieldGroup className="fc-nutrition-goals">
            <Field><FieldLabel htmlFor="target-calories">{tr(props.language, "Target kalori (kkal/hari)", "Calorie goal (kcal/day)")}</FieldLabel><input id="target-calories" type="number" min="1000" max="6000" step="1" value={targetDraft || ""} onChange={(e) => { setTargetDraft(Number(e.target.value)); setTargetSource("manual"); }} required /></Field>
            {(["protein", "carbs", "fat"] as const).map((key) => <Field key={key}><FieldLabel htmlFor={`target-${key}`}>{key === "protein" ? "Protein" : key === "carbs" ? tr(props.language, "Karbohidrat", "Carbohydrates") : tr(props.language, "Lemak", "Fat")} ({tr(props.language, "g/hari", "g/day")})</FieldLabel><input id={`target-${key}`} type="number" min="0" max="1000" step="1" value={macroDraft[key]} onChange={(e) => { setMacroDraft((current) => ({ ...current, [key]: Number(e.target.value) })); setTargetSource("manual"); }} required /></Field>)}
            <Field><FieldLabel htmlFor="target-note">{tr(props.language, "Catatan (opsional)", "Note (optional)")}</FieldLabel><input id="target-note" maxLength={300} value={targetNote} onChange={(e) => setTargetNote(e.target.value)} placeholder={tr(props.language, "Alasan perubahan target", "Reason for changing the goal")} /></Field>
          </FieldGroup>
          {estimate && <Button variant="outline" type="button" onClick={() => { setTargetDraft(estimate.calories); setMacroDraft(estimate.macros); setTargetSource("calculated"); }}>{tr(props.language, "Buat rekomendasi otomatis", "Generate recommendation")} <ArrowRight size={16} /></Button>}
          <p className="microcopy">{tr(props.language, "Sumber:", "Source:")} {targetSource === "calculated" ? tr(props.language, "perkiraan dari rumus", "formula estimate") : tr(props.language, "diisi manual", "manual entry")}. {tr(props.language, "Tinjau angkanya sebelum menyimpan.", "Review the numbers before saving.")}</p>
          <button className="primary-button" type="submit" disabled={busy || props.storageMode === "loading" || props.storageMode === "error"}>{busy ? tr(props.language, "Menyimpan...", "Saving...") : tr(props.language, "Simpan target baru", "Save new goals")}</button>
          {targetNotice && ((targetNotice.startsWith("Target baru aktif") || targetNotice.startsWith("New goals")) ? <p className="form-notice" role="status">{targetNotice}</p> : <FieldError>{targetNotice}</FieldError>)}
        </form>
        <div className="formula-note"><CircleHelp size={18} /><p>{tr(props.language, "Perkiraan memakai Mifflin–St Jeor dan aktivitas profil. Untuk naik berat, aplikasi memakai surplus awal 300–500 kkal/hari menurut laju yang dipilih. Ini estimasi umum, bukan diagnosis atau pengganti saran tenaga kesehatan.", "The estimate uses Mifflin–St Jeor and your activity level. For weight gain, it uses a starting surplus of 300–500 kcal/day based on the chosen pace. This is a general estimate, not a diagnosis or a substitute for professional care.")} <a href="https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/healthy-ways-to-gain-weight/" target="_blank" rel="noopener noreferrer">{tr(props.language, "Panduan NHS", "NHS guidance")}</a></p></div>
      </section>
    </div>
    <section className="panel target-history" hidden={section !== "target"}><span className="card-kicker">{tr(props.language, "RIWAYAT TARGET", "GOAL HISTORY")}</span><h2>{tr(props.language, "Perubahan target", "Goal changes")}</h2>
      {props.targets.length ? <ol>{props.targets.map((record) => <li key={record.id}><div><strong>{fmt(record.calories)} {tr(props.language, "kkal/hari", "kcal/day")}</strong><span>{record.source === "calculated" ? tr(props.language, "Dari rumus", "Estimated") : "Manual"} · {tr(props.language, "berlaku", "effective")} {new Date(record.effectiveAt).toLocaleString(props.language, { dateStyle: "medium", timeStyle: "short" })}</span>{record.macros && <small>Protein {record.macros.protein} g · {tr(props.language, "Karbo", "Carbs")} {record.macros.carbs} g · {tr(props.language, "Lemak", "Fat")} {record.macros.fat} g</small>}{record.note && <small>{record.note}</small>}{record.inputs && <small>{tr(props.language, "Usia", "Age")} {record.inputs.age} · {record.inputs.weight} kg · {record.inputs.height} cm · {record.inputs.activity} · {record.inputs.goal} · {record.formulaVersion}</small>}</div></li>)}</ol> : <p className="microcopy">{tr(props.language, "Belum ada riwayat. Simpan target pertama untuk mulai mencatat perubahan.", "No history yet. Save your first goal to begin tracking changes.")}</p>}
    </section>
    <section className="panel account-panel" hidden={section !== "account"}><span className="card-kicker">{tr(props.language, "AKUN", "ACCOUNT")}</span><h2>{props.accountId ? tr(props.language, "Tersambung ke Supabase", "Connected to Supabase") : tr(props.language, "Simpan lintas perangkat", "Save across devices")}</h2>
      {props.recoveryMode ? <form className="account-form" onSubmit={submitAuth}><p>{tr(props.language, "Buat kata sandi baru untuk akunmu.", "Create a new password for your account.")}</p><Field><FieldLabel htmlFor="recovery-password">{tr(props.language, "Kata sandi baru", "New password")}</FieldLabel><input id="recovery-password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></Field><Field><FieldLabel htmlFor="recovery-confirm">{tr(props.language, "Ulangi kata sandi", "Confirm password")}</FieldLabel><input id="recovery-confirm" type="password" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field><button className="primary-button" disabled={authBusy}>{authBusy ? tr(props.language, "Menyimpan...", "Saving...") : tr(props.language, "Ganti kata sandi", "Change password")}</button></form>
      : props.accountId ? <><p>{props.accountEmail}</p><button className="outline-button" disabled={authBusy} onClick={signOut}>{authBusy ? tr(props.language, "Keluar...", "Signing out...") : tr(props.language, "Keluar dari akun", "Sign out")}</button>{props.canImport && <div className="import-demo"><p>{tr(props.language, "Ada catatan demo di perangkat ini. Impor profil dan makanan ke akun sekali saja; data demo tetap tersimpan.", "Demo records are on this device. Import the profile and meals to your account once; demo data stays on the device.")}</p><button className="outline-button" disabled={importBusy} onClick={async () => { setImportBusy(true); setAuthError(""); try { await props.onImport(); setAuthNotice(tr(props.language, "Data demo berhasil diimpor.", "Demo data imported.")); } catch { setAuthError(tr(props.language, "Impor belum selesai. Coba lagi; catatan yang sudah masuk tidak akan digandakan.", "Import did not finish. Try again; imported records will not be duplicated.")); } finally { setImportBusy(false); } }}>{importBusy ? tr(props.language, "Mengimpor...", "Importing...") : tr(props.language, "Impor data demo", "Import demo data")}</button></div>}</>
      : props.supabaseConfigured ? <><div className="auth-tabs"><button className={authMode === "signin" ? "active" : ""} onClick={() => { setAuthMode("signin"); setAuthError(""); }}>{tr(props.language, "Masuk", "Sign in")}</button><button className={authMode === "signup" ? "active" : ""} onClick={() => { setAuthMode("signup"); setAuthError(""); }}>{tr(props.language, "Daftar", "Sign up")}</button><button className={authMode === "reset" ? "active" : ""} onClick={() => { setAuthMode("reset"); setAuthError(""); }}>{tr(props.language, "Lupa sandi", "Forgot password")}</button></div><form className="account-form" onSubmit={submitAuth}><p>{tr(props.language, "Catatan demo di perangkat ini tetap terpisah dari akun.", "Demo records on this device stay separate from your account.")}</p><Field><FieldLabel htmlFor="account-email">Email</FieldLabel><input id="account-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>{authMode !== "reset" && <Field><FieldLabel htmlFor="account-password">{tr(props.language, "Kata sandi", "Password")}</FieldLabel><input id="account-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}{authMode === "signup" && <Field><FieldLabel htmlFor="account-confirm">{tr(props.language, "Ulangi kata sandi", "Confirm password")}</FieldLabel><input id="account-confirm" type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field>}<button className="primary-button" disabled={authBusy}>{authBusy ? tr(props.language, "Memproses...", "Working...") : authMode === "signup" ? tr(props.language, "Buat akun", "Create account") : authMode === "reset" ? tr(props.language, "Kirim tautan pemulihan", "Send recovery link") : tr(props.language, "Masuk", "Sign in")}</button></form>{authMode === "signin" && <button className="text-button" disabled={authBusy} onClick={magicLink}>{tr(props.language, "Atau kirim tautan masuk lewat email", "Or email me a sign-in link")}</button>}</>
      : <p>{tr(props.language, "Mode demo aktif. Tambahkan URL proyek dan publishable key ke .env.local untuk mengaktifkan akun.", "Demo mode is active. Add the project URL and publishable key to .env.local to enable accounts.")}</p>}
      {authNotice && <p className="form-notice" role="status">{authNotice}</p>}{authError && <p className="error-message" role="alert">{authError}</p>}
      {props.accountId && !props.recoveryMode && <AccountPassword />}
    </section>
    <section className="panel privacy-panel" hidden={section !== "account"}><div><span className="card-kicker">{tr(props.language, "DATA & PRIVASI", "DATA & PRIVACY")}</span><h2>{props.accountId ? tr(props.language, "Data akun", "Account data") : tr(props.language, "Mode demo lokal", "Local demo mode")}</h2><p>{props.accountId ? tr(props.language, "Catatan dan foto baru tersimpan di akun. Foto lama yang hanya ada di perangkat tetap lokal.", "New records and photos are saved to your account. Older photos that exist only on this device stay local.") : tr(props.language, "Catatan dan foto disimpan di browser perangkat ini.", "Records and photos are saved in this device’s browser.")}</p><p>{tr(props.language, "Untuk memasang Forkcast: di iPhone gunakan Bagikan → Tambahkan ke Layar Utama; di Android pilih Instal aplikasi pada menu browser.", "To install Forkcast: on iPhone use Share → Add to Home Screen; on Android choose Install app from the browser menu.")}</p></div><Button variant="destructive" onClick={props.onRemoveAll}><Trash2 size={17} /> {props.accountId ? tr(props.language, "Hapus data akun", "Delete account data") : tr(props.language, "Hapus semua data", "Delete all data")}</Button></section>
    {section === "weight" && <section className="panel profile-weight-panel"><span className="card-kicker">{tr(props.language, "RIWAYAT BERAT", "WEIGHT HISTORY")}</span><h2>{tr(props.language, "Catatan berat", "Weight entries")}</h2>
      {props.weights.length ? <div className="weight-list">{[...props.weights].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <div key={entry.id}><span>{new Date(`${entry.date}T12:00:00`).toLocaleDateString(props.language, { dateStyle: "long" })}</span><strong>{entry.weight} kg</strong></div>)}</div> : <p className="microcopy">{tr(props.language, "Belum ada catatan berat.", "No weight entries yet.")}</p>}
      <p className="microcopy">{tr(props.language, "Tambah atau ubah catatan berat di tab Progres.", "Add or edit weight entries in the Progress tab.")}</p><button className="outline-button" type="button" onClick={props.onOpenProgress}>{tr(props.language, "Buka Progres", "Open Progress")} <ArrowRight size={16} /></button>
    </section>}
    <div className="profile-update-slot" hidden={section !== "overview" && section !== "updates"}><PwaUpdates compact={section === "overview"} onOpen={() => setSection("updates")} hasUnsavedChanges={dirty || targetDirty} onConfirmedReload={() => { allowConfirmedReload.current = true; }} /></div>
  </>;
}
