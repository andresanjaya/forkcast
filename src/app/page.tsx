"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { deleteAllAccountData, deleteMeal as deleteRemoteMeal, deleteWeight as deleteRemoteWeight, insertMeal as insertRemoteMeal, insertSavedMeal, insertWeight as insertRemoteWeight, loadAccountData, upsertProfile } from "@/lib/supabase/data";
import { Activity, ArrowRight, Bookmark, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Flame, Home, Info, Leaf, MoreHorizontal, Plus, Search, Settings2, Sparkles, Trash2, TrendingUp, Upload, UserRound, UtensilsCrossed, WifiOff, X } from "lucide-react";
import { changeServing, defaultProfile, editMealItem, foods, itemFromFood, matchCandidateFood, mealTypes, nutrientsFor, suggestedTarget, total, type Food, type Meal, type MealItem, type MealType, type Profile, type SavedMeal, type WeightEntry } from "@/lib/food";

type Tab = "beranda" | "riwayat" | "progres" | "profil";
type EditorMode = "manual" | "foto" | "tersimpan";
type Analysis = { items: { candidateName: string; estimatedServing: { value: number; unit: string; gramsMin: number; gramsMax: number }; visibleNotes: string; confidence: string; needsConfirmation: boolean }[]; followUpQuestion?: string; disclaimer: string; demo: boolean };
const STORAGE = "porsi-demo-v1";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", options ?? { weekday: "long", day: "numeric", month: "long" });
const number = (value: number) => Math.round(value).toLocaleString("id-ID");
const cloneItems = (items: MealItem[]) => items.map((item) => ({ ...item, id: crypto.randomUUID(), per100g: { ...item.per100g } }));

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("beranda");
  const [date, setDate] = useState(today);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [mealType, setMealType] = useState<MealType>("Makan siang");
  const [mealDate, setMealDate] = useState(today);
  const [mealTime, setMealTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [draft, setDraft] = useState<MealItem[]>([]);
  const [mealTitle, setMealTitle] = useState("");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisConfirmed, setAnalysisConfirmed] = useState(false);
  const [unmatchedCandidates, setUnmatchedCandidates] = useState<string[]>([]);
  const [analysisError, setAnalysisError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [answer, setAnswer] = useState("");
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [message, setMessage] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [targetEdited, setTargetEdited] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [storageMode, setStorageMode] = useState<"local" | "loading" | "account" | "error">("local");
  const [saving, setSaving] = useState(false);
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) {
        const data = JSON.parse(saved);
        setProfile(data.profile ?? defaultProfile);
        setMeals(Array.isArray(data.meals) ? data.meals : []);
        setSavedMeals(Array.isArray(data.savedMeals) ? data.savedMeals : []);
        setWeights(Array.isArray(data.weights) ? data.weights : []);
      } else {
        const demoItems = [itemFromFood(foods[0]), itemFromFood(foods[1]), itemFromFood(foods[6])];
        setMeals([{ id: crypto.randomUUID(), date: today(), type: "Makan siang", title: "Nasi, ayam bakar & sayur", method: "manual", items: demoItems, createdAt: new Date().toISOString() }]);
      }
    } catch { setMessage("Data lokal tidak dapat dibaca. Kamu tetap bisa mulai mencatat."); }
    setReady(true);
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as Event & { prompt: () => Promise<void> }); };
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline); window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); window.removeEventListener("beforeinstallprompt", onInstall); };
  }, []);
  useEffect(() => { if (ready && storageMode === "local") localStorage.setItem(STORAGE, JSON.stringify({ profile, meals, savedMeals, weights })); }, [ready, storageMode, profile, meals, savedMeals, weights]);
  useEffect(() => { if (!message) return; const timeout = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(timeout); }, [message]);
  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setAccountId(session.user.id); setAccountEmail(session.user.email ?? ""); setStorageMode("loading");
      } else if (event === "SIGNED_OUT") {
        setAccountId(null); setAccountEmail(""); setStorageMode("loading");
        try {
          const local = JSON.parse(localStorage.getItem(STORAGE) ?? "{}");
          setProfile(local.profile ?? defaultProfile); setMeals(local.meals ?? []); setSavedMeals(local.savedMeals ?? []); setWeights(local.weights ?? []);
        } catch { setProfile(defaultProfile); setMeals([]); setSavedMeals([]); setWeights([]); }
        setStorageMode("local");
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!accountId || storageMode !== "loading") return;
    let cancelled = false;
    const client = getSupabaseBrowser();
    if (!client) return;
    loadAccountData(client, accountId).then((data) => {
      if (cancelled) return;
      setProfile(data.profile); setMeals(data.meals); setSavedMeals(data.savedMeals); setWeights(data.weights); setStorageMode("account");
    }).catch(() => { if (!cancelled) { setStorageMode("error"); setMessage("Data akun belum bisa dimuat. Periksa migrasi dan koneksi Supabase."); } });
    return () => { cancelled = true; };
  }, [accountId, storageMode]);
  useEffect(() => {
    if (!accountId || storageMode !== "account") return;
    if (profile.age < 18 || profile.age > 120 || profile.height < 100 || profile.height > 250 || profile.weight < 20 || profile.weight > 400 || profile.calorieTarget < 1000 || profile.calorieTarget > 6000) return;
    const client = getSupabaseBrowser(); if (!client) return;
    const timer = setTimeout(() => upsertProfile(client, accountId, profile).catch(() => setMessage("Profil belum tersinkron. Periksa koneksi dan coba ubah kembali.")), 700);
    return () => clearTimeout(timer);
  }, [accountId, storageMode, profile]);

  const dayMeals = useMemo(() => meals.filter((meal) => meal.date === date), [meals, date]);
  const dayTotal = useMemo(() => total(dayMeals.flatMap((meal) => meal.items)), [dayMeals]);
  const target = profile.calorieTarget || suggestedTarget(profile);
  const remaining = target - dayTotal.calories;
  const filteredFoods = useMemo(() => foods.filter((food) => `${food.name} ${food.aliases.join(" ")}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [query]);
  const recentMeals = useMemo(() => [...meals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [meals]);
  const dailyHistory = useMemo(() => Array.from({ length: 7 }, (_, index) => { const d = new Date(); d.setDate(d.getDate() - (6 - index)); const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; return { date: day, calories: total(meals.filter((meal) => meal.date === day).flatMap((meal) => meal.items)).calories }; }), [meals]);

  function openEditor(mode: EditorMode, items: MealItem[] = [], title = "") {
    setEditor(mode); setDraft(cloneItems(items)); setMealTitle(title); setMealDate(date); setMealTime(new Date().toTimeString().slice(0, 5)); setQuery(""); setAnalysis(null); setAnalysisConfirmed(false); setUnmatchedCandidates([]); setAnalysisError(""); setPhotoName(""); setPhotoFile(null); setAnswer(""); setSearchOpen(mode === "manual" && items.length === 0); setCustomOpen(false);
  }
  function addFood(food: Food) { setDraft((current) => [...current, itemFromFood(food)]); setSearchOpen(false); setQuery(""); }
  function updateItem(id: string, patch: Partial<MealItem>) { setDraft((current) => editMealItem(current, id, patch)); }
  async function saveMeal() {
    if (!draft.length) { setMessage("Tambahkan setidaknya satu makanan."); return; }
    if (analysis && (!analysisConfirmed || unmatchedCandidates.length > 0)) { setMessage("Periksa semua kandidat foto dan konfirmasi sebelum menyimpan."); return; }
    if (draft.some((item) => !item.name.trim() || item.grams <= 0 || !Number.isFinite(item.grams))) { setMessage("Periksa nama dan porsi makanan."); return; }
    const eatenAt = new Date(`${mealDate}T${mealTime}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate) || !/^\d{2}:\d{2}$/.test(mealTime) || Number.isNaN(eatenAt.getTime())) { setMessage("Periksa tanggal dan waktu makan."); return; }
    const title = mealTitle.trim() || draft.map((item) => item.name).slice(0, 2).join(" & ");
    const meal: Meal = { id: crypto.randomUUID(), date: mealDate, eatenAt: eatenAt.toISOString(), type: mealType, title, method: editor === "foto" ? "foto" : editor === "tersimpan" ? "tersimpan" : "manual", items: cloneItems(draft), createdAt: new Date().toISOString() };
    if (accountId) {
      if (storageMode !== "account") { setMessage("Tunggu data akun siap sebelum menyimpan."); return; }
      const client = getSupabaseBrowser(); if (!client) return;
      setSaving(true);
      try { await insertRemoteMeal(client, accountId, meal); }
      catch { setMessage("Makanan belum tersimpan ke akun. Periksa koneksi dan coba lagi."); setSaving(false); return; }
      setSaving(false);
    }
    setMeals((current) => [meal, ...current]); setDate(mealDate); setEditor(null); setTab("beranda"); setMessage("Makanan tersimpan. Kamu bisa mengubahnya kapan saja.");
  }
  async function saveCombination() {
    if (!draft.length) { setMessage("Tambahkan makanan dulu."); return; }
    const title = mealTitle.trim() || draft.map((item) => item.name).slice(0, 2).join(" & ");
    const saved = { id: crypto.randomUUID(), title, items: cloneItems(draft) };
    if (accountId) {
      if (storageMode !== "account") { setMessage("Tunggu data akun siap."); return; }
      const client = getSupabaseBrowser(); if (!client) return;
      try { await insertSavedMeal(client, accountId, saved); } catch { setMessage("Kombinasi belum tersimpan. Coba lagi."); return; }
    }
    setSavedMeals((current) => [saved, ...current]); setMessage("Kombinasi disimpan untuk lain kali.");
  }
  async function saveExistingCombination(meal: Meal) {
    const saved = { id: crypto.randomUUID(), title: meal.title, items: cloneItems(meal.items) };
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      try { await insertSavedMeal(client, accountId, saved); } catch { setMessage("Kombinasi belum tersimpan. Coba lagi."); return; }
    }
    setSavedMeals((current) => [saved, ...current]); setMessage("Disimpan untuk lain kali.");
  }
  async function removeMeal(id: string) {
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      try { await deleteRemoteMeal(client, accountId, id); } catch { setMessage("Catatan belum terhapus dari akun. Coba lagi."); return; }
    }
    setMeals((current) => current.filter((meal) => meal.id !== id)); setMessage("Catatan dihapus.");
  }
  async function recordWeight(weight: number) {
    const entry = { id: crypto.randomUUID(), date: today(), weight };
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      try { await insertRemoteWeight(client, accountId, entry); } catch { setMessage("Berat belum tersimpan ke akun."); return; }
    }
    setWeights((current) => [entry, ...current]); setProfile((current) => ({ ...current, weight })); setWeightInput(""); setMessage("Berat badan tersimpan.");
  }
  async function removeWeight(id: string) {
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      try { await deleteRemoteWeight(client, accountId, id); } catch { setMessage("Catatan berat belum terhapus."); return; }
    }
    setWeights((current) => current.filter((item) => item.id !== id));
  }
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseBrowser(); if (!client) return;
    const email = signInEmail.trim();
    if (!email) return;
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setMessage(error ? "Tautan masuk belum dapat dikirim. Periksa email dan konfigurasi Auth." : "Tautan masuk dikirim. Buka emailmu untuk melanjutkan.");
  }
  async function removeAllData() {
    if (!confirm(accountId ? "Hapus semua catatan akun dan profil? Akun masuk tetap ada." : "Hapus semua catatan, profil, dan berat dari perangkat ini?")) return;
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      try { await deleteAllAccountData(client, accountId); } catch { setMessage("Sebagian data akun belum terhapus. Periksa koneksi dan coba lagi."); return; }
      await client.auth.signOut();
      setMessage("Data akun dihapus. Kamu telah keluar dari akun.");
      return;
    }
    localStorage.removeItem(STORAGE);
    setMeals([]); setSavedMeals([]); setWeights([]); setProfile(defaultProfile); setMessage("Data catatan telah dihapus.");
  }
  function addCustom() {
    const calories = Number(customCalories), protein = Number(customProtein), carbs = Number(customCarbs), fat = Number(customFat);
    if (!customName.trim() || [calories, protein, carbs, fat].some((value) => !Number.isFinite(value) || value < 0)) { setMessage("Isi nama dan nilai gizi per 100 g dengan angka yang valid."); return; }
    setDraft((current) => [...current, { id: crypto.randomUUID(), foodId: null, name: customName.trim(), quantity: 100, unit: "gram", gramsPerUnit: 1, grams: 100, per100g: { calories, protein, carbs, fat }, source: "Diisi pengguna", corrected: true }]);
    setCustomOpen(false); setSearchOpen(false); setCustomName(""); setCustomCalories(""); setCustomProtein(""); setCustomCarbs(""); setCustomFat("");
  }
  async function analyzePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoName(file.name); setPhotoFile(file); setAnalysisError(""); setAnalysis(null); setAnalysisConfirmed(false); setUnmatchedCandidates([]); setDraft([]);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setAnalysisError("Gunakan foto JPEG, PNG, atau WebP."); return; }
    if (file.size > 8 * 1024 * 1024) { setAnalysisError("Foto terlalu besar. Pilih foto di bawah 8 MB."); return; }
    if (!online) { setAnalysisError("Sedang offline. Kamu tetap bisa menambahkan makanan secara manual."); return; }
    setAnalyzing(true);
    try {
      const compressed = await compressImage(file);
      const form = new FormData(); form.append("image", compressed); if (answer.trim()) form.append("context", answer.trim());
      const session = await getSupabaseBrowser()?.auth.getSession();
      const accessToken = session?.data.session?.access_token;
      let response = await fetch("/api/meal/analyze", { method: "POST", body: form, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined });
      if (response.status === 401 && accessToken) response = await fetch("/api/meal/analyze", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analisis belum tersedia.");
      setAnalysis(result);
      const matched = result.items.map((candidate: Analysis["items"][number]) => {
        const food = matchCandidateFood(candidate.candidateName);
        if (!food) return null;
        const item = itemFromFood(food); const grams = Math.max(1, Math.round((candidate.estimatedServing.gramsMin + candidate.estimatedServing.gramsMax) / 2));
        return { ...item, unit: "gram", gramsPerUnit: 1, quantity: grams, grams, corrected: false };
      }).filter((item: MealItem | null): item is MealItem => item !== null);
      setDraft(matched);
      setUnmatchedCandidates(result.items.filter((candidate: Analysis["items"][number]) => !matchCandidateFood(candidate.candidateName)).map((candidate: Analysis["items"][number]) => candidate.candidateName));
    } catch (error) { setAnalysisError(error instanceof Error ? error.message : "Analisis gagal. Coba lagi atau catat manual."); }
    finally { setAnalyzing(false); }
  }
  function moveDate(days: number) { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + days); setDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`); }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Leaf size={23} strokeWidth={2.4} /></span><span>porsi<span className="brand-dot">.</span></span></div>
      <div className="sidebar-label">MENU</div>
      <nav aria-label="Navigasi utama" className="side-nav">
        <NavButton active={tab === "beranda"} icon={<Home size={19} />} label="Beranda" onClick={() => setTab("beranda")} />
        <NavButton active={tab === "riwayat"} icon={<ClipboardList size={19} />} label="Riwayat makan" onClick={() => setTab("riwayat")} />
        <NavButton active={tab === "progres"} icon={<TrendingUp size={19} />} label="Progres" onClick={() => setTab("progres")} />
        <NavButton active={tab === "profil"} icon={<UserRound size={19} />} label="Profil & target" onClick={() => setTab("profil")} />
      </nav>
      <div className="sidebar-bottom"><div className="tip-icon"><Sparkles size={20} /></div><strong>Sedikit demi sedikit.</strong><p>Kenali pola makanmu tanpa perlu mengejar angka sempurna.</p></div>
      <div className="sidebar-footer"><span className="avatar">{profile.name ? profile.name.charAt(0).toUpperCase() : "P"}</span><span><strong>{profile.name || "Teman Porsi"}</strong><small>{accountId ? "Akun tersinkron" : "Mode demo lokal"}</small></span><MoreHorizontal size={18} /></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><Leaf size={20} /></span><strong>porsi<span className="brand-dot">.</span></strong></div><div className="topbar-spacer" /><span className="demo-pill"><span className="pill-dot" /> {accountId ? "AKUN AKTIF" : "MODE DEMO"}</span><button className="avatar top-avatar" onClick={() => setTab("profil")} aria-label="Buka profil">{profile.name ? profile.name.charAt(0).toUpperCase() : "P"}</button></header>
      {!online && <div className="offline-banner"><WifiOff size={17} /> Kamu sedang offline. Catatan lokal tetap bisa digunakan; analisis foto menunggu koneksi.</div>}
      {storageMode === "loading" && <div className="offline-banner" role="status">Memuat catatan akunmu...</div>}
      {storageMode === "error" && <div className="offline-banner" role="alert">Catatan akun belum dapat dimuat. <button className="text-button" onClick={() => setStorageMode("loading")}>Coba lagi</button></div>}
      {message && <div className="toast" role="status"><Check size={17} />{message}<button onClick={() => setMessage("")} aria-label="Tutup pesan"><X size={16} /></button></div>}
      <div className="content">
        {tab === "beranda" && <>
          <div className="page-head"><div><div className="eyebrow">HARI INI, SATU LANGKAH LEBIH BAIK</div><h1>Halo{profile.name ? `, ${profile.name}` : ""} <span className="wave">👋</span></h1><p>Yuk, lihat gambaran makanmu hari ini.</p></div><button className="date-select" onClick={() => setDate(today())}><CalendarDays size={18} /><span>{formatDate(date, { day: "numeric", month: "long", year: "numeric" })}</span><ChevronDown size={16} /></button></div>
          <div className="demo-note"><Info size={17} /><span>{accountId ? "Catatan akun tersimpan di Supabase. Nilai gizi pada katalog masih berupa contoh perkiraan." : "Ini mode demo. Catatan tersimpan hanya di perangkat ini. Nilai gizi pada katalog adalah contoh perkiraan."}</span></div>
          <div className="dashboard-grid"><section className="calorie-card" aria-label="Ringkasan kalori"><div className="card-top"><span className="card-kicker">RINGKASAN HARIAN</span><span className="card-soft-icon"><Flame size={20} /></span></div><div className="calorie-main"><div><span className="big-number">{number(dayTotal.calories)}</span><span className="big-unit"> kkal</span><div className="subtext">dari target {number(target)} kkal</div></div><div className="calorie-ring" style={{ "--progress": `${Math.min(dayTotal.calories / target * 100, 100)}%` } as React.CSSProperties}><div><Flame size={23} fill="currentColor" /><small>{Math.round(dayTotal.calories / target * 100)}%</small></div></div></div><div className="calorie-bottom"><span>{remaining >= 0 ? "Sisa hari ini" : "Di atas target"}</span><strong>{number(Math.abs(remaining))} kkal</strong></div></section>
          <section className="macro-card"><div className="card-top"><div><span className="card-kicker">NUTRISI HARI INI</span><h2>Makro kamu</h2></div><span className="card-soft-icon"><Activity size={19} /></span></div><div className="macro-list"><Macro label="Protein" value={dayTotal.protein} target={Math.round(profile.weight * 1.2)} color="orange" /><Macro label="Karbohidrat" value={dayTotal.carbs} target={Math.round(target * .5 / 4)} color="green" /><Macro label="Lemak" value={dayTotal.fat} target={Math.round(target * .3 / 9)} color="yellow" /></div><p className="microcopy">Target makro adalah panduan sederhana, bukan resep medis.</p></section></div>
          <div className="section-heading"><div><span className="eyebrow">CATATAN MAKAN</span><h2>Makananmu hari ini</h2></div><div className="date-arrows"><button onClick={() => moveDate(-1)} aria-label="Hari sebelumnya"><ChevronLeft size={19} /></button><button onClick={() => moveDate(1)} aria-label="Hari berikutnya" disabled={date >= today()}><ChevronRight size={19} /></button></div></div>
          <div className="meal-grid">{mealTypes.map((type) => { const list = dayMeals.filter((meal) => meal.type === type); return <section className="meal-section" key={type}><div className="meal-section-head"><div className="meal-icon">{type === "Sarapan" ? "☀️" : type === "Makan siang" ? "🍽️" : type === "Makan malam" ? "🌙" : "🍌"}</div><div><h3>{type}</h3><span>{list.length ? `${list.length} catatan` : "Belum ada catatan"}</span></div><strong>{list.length ? `${number(list.reduce((sum, meal) => sum + total(meal.items).calories, 0))} kkal` : ""}</strong></div>{list.map((meal) => <div className="meal-row" key={meal.id}><div><strong>{meal.title}</strong><span>{meal.items.map((item) => item.name).join(", ")}</span></div><div className="meal-row-right"><b>{number(total(meal.items).calories)}</b><button onClick={() => removeMeal(meal.id)} aria-label={`Hapus ${meal.title}`}><Trash2 size={15} /></button></div></div>)}<button className="add-small" onClick={() => { setMealType(type); openEditor("manual"); }}><Plus size={16} /> Tambah {type.toLowerCase()}</button></section>; })}</div>
          <div className="below-grid"><section className="quick-card"><div className="quick-illustration"><div className="plate"><span>🥗</span></div><span className="sparkle-one">✦</span><span className="sparkle-two">✧</span></div><div><span className="eyebrow">CARA CEPAT</span><h2>Satu foto, satu langkah awal.</h2><p>Kenali kandidat makanan dari foto, lalu sesuaikan porsinya sebelum disimpan.</p><button className="dark-button" onClick={() => { setMealType("Makan siang"); openEditor("foto"); }}><Camera size={17} /> Coba analisis foto <ArrowRight size={17} /></button></div></section><section className="insight-card"><span className="eyebrow">PENGINGAT LEMBUT</span><div className="insight-icon"><Leaf size={22} /></div><h2>Angka adalah panduan, bukan penilaian.</h2><p>Porsi dan cara memasak bisa berbeda. Koreksi estimasi agar catatanmu lebih dekat dengan makanan yang benar-benar kamu makan.</p></section></div>
        </>}
        {tab === "riwayat" && <><PageIntro eyebrow="CATATANMU" title="Riwayat makan" subtitle="Semua makanan yang kamu catat, tersusun dari yang terbaru." /><div className="history-actions"><button className="primary-button" onClick={() => openEditor("manual")}><Plus size={18} /> Catat makanan</button><button className="outline-button" onClick={() => openEditor("tersimpan")}><Bookmark size={17} /> Makanan tersimpan</button></div>{meals.length ? [...meals].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`)).map((meal) => <div className="history-card" key={meal.id}><div className="history-date">{formatDate(meal.date)} · {meal.eatenAt ? new Date(meal.eatenAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""} · {meal.type}</div><div className="history-main"><div><h3>{meal.title}</h3><p>{meal.items.map((item) => `${item.name} ${number(item.grams)} g`).join(" · ")}</p><small>{meal.method === "foto" ? "Ditinjau dari foto" : meal.method === "tersimpan" ? "Dari makanan tersimpan" : "Dicatat manual"} · Estimasi</small></div><div className="history-nutrition"><strong>{number(total(meal.items).calories)} <small>kkal</small></strong><span>P {number(total(meal.items).protein)} · K {number(total(meal.items).carbs)} · L {number(total(meal.items).fat)} g</span></div></div><div className="history-footer"><button onClick={() => { setDate(meal.date); setMealType(meal.type); openEditor("manual", meal.items, meal.title); }}>Catat lagi <ArrowRight size={15} /></button><button onClick={() => saveExistingCombination(meal)}><Bookmark size={15} /> Simpan kombinasi</button><button className="danger-text" onClick={() => removeMeal(meal.id)}><Trash2 size={15} /> Hapus</button></div></div>) : <EmptyState icon={<UtensilsCrossed size={27} />} title="Belum ada catatan" description="Mulai dengan mencari makanan atau menambahkan dari foto." action="Catat makanan" onAction={() => openEditor("manual")} />}</>}
        {tab === "progres" && <><PageIntro eyebrow="GAMBARAN BESAR" title="Progresmu" subtitle="Lihat pola dari waktu ke waktu, dengan ruang untuk hari yang berbeda." /><div className="progress-grid"><section className="panel"><div className="card-top"><div><span className="card-kicker">7 HARI TERAKHIR</span><h2>Kalori harian</h2></div><span className="card-soft-icon"><Activity size={19} /></span></div><div className="bar-chart" aria-label="Grafik kalori tujuh hari terakhir">{dailyHistory.map((day) => <div className="bar-column" key={day.date}><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.min(day.calories / Math.max(target, 1) * 100, 100)}%` }} title={`${formatDate(day.date)}: ${number(day.calories)} kkal`} /></div><span>{formatDate(day.date, { weekday: "short" })}</span><small>{day.calories ? number(day.calories) : "—"}</small></div>)}</div><p className="microcopy">Hari tanpa catatan ditampilkan kosong, bukan sebagai nol konsumsi.</p></section><section className="panel"><div className="card-top"><div><span className="card-kicker">BERAT BADAN</span><h2>Catatan berat</h2></div><span className="card-soft-icon"><TrendingUp size={19} /></span></div><div className="weight-current"><strong>{weights.length ? [...weights].sort((a, b) => b.date.localeCompare(a.date))[0].weight : profile.weight} <small>kg</small></strong><span>{weights.length ? "Catatan terakhir" : "Dari profil"}</span></div><form className="weight-form" onSubmit={(event) => { event.preventDefault(); const weight = Number(weightInput); if (weight < 20 || weight > 400) { setMessage("Masukkan berat antara 20–400 kg."); return; } void recordWeight(weight); }}><label htmlFor="weight">Catat berat hari ini</label><div><input id="weight" type="number" step="0.1" min="20" max="400" placeholder="Contoh: 65,5" value={weightInput} onChange={(event) => setWeightInput(event.target.value)} required /><button className="primary-button" type="submit">Simpan</button></div></form>{weights.length > 0 && <div className="weight-list">{[...weights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((entry) => <div key={entry.id}><span>{formatDate(entry.date)}</span><strong>{entry.weight} kg</strong><button aria-label={`Hapus berat ${entry.date}`} onClick={() => removeWeight(entry.id)}><X size={15} /></button></div>)}</div>}</section></div></>}
        {tab === "profil" && <><PageIntro eyebrow="TENTANG KAMU" title="Profil & target" subtitle="Sesuaikan perkiraan dengan kebutuhan dan kenyamananmu." /><div className="profile-grid"><section className="panel"><div className="card-top"><div><span className="card-kicker">DATA DASAR</span><h2>Profilmu</h2></div><span className="card-soft-icon"><UserRound size={19} /></span></div><div className="form-grid"><Field label="Nama panggilan (opsional)"><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Panggilanmu" /></Field><Field label="Usia"><input type="number" min="18" max="120" value={profile.age} onChange={(event) => setProfile({ ...profile, age: Number(event.target.value) })} /></Field><Field label="Tinggi (cm)"><input type="number" min="100" max="250" value={profile.height} onChange={(event) => setProfile({ ...profile, height: Number(event.target.value) })} /></Field><Field label="Berat (kg)"><input type="number" min="20" max="400" step="0.1" value={profile.weight} onChange={(event) => setProfile({ ...profile, weight: Number(event.target.value) })} /></Field><Field label="Parameter rumus dasar"><select value={profile.sex} onChange={(event) => setProfile({ ...profile, sex: event.target.value as Profile["sex"] })}><option value="wanita">Koefisien wanita</option><option value="pria">Koefisien pria</option></select></Field><Field label="Aktivitas"><select value={profile.activity} onChange={(event) => setProfile({ ...profile, activity: event.target.value as Profile["activity"] })}><option value="rendah">Rendah · banyak duduk</option><option value="ringan">Ringan · bergerak sesekali</option><option value="sedang">Sedang · aktif rutin</option><option value="tinggi">Tinggi · sangat aktif</option></select></Field><Field label="Tujuan"><select value={profile.goal} onChange={(event) => setProfile({ ...profile, goal: event.target.value as Profile["goal"] })}><option value="turun">Turun berat</option><option value="jaga">Jaga berat</option><option value="naik">Naik berat</option></select></Field></div></section><section className="panel target-panel"><div className="card-top"><div><span className="card-kicker">PANDUAN HARIAN</span><h2>Target kalorimu</h2></div><span className="card-soft-icon"><Settings2 size={19} /></span></div><div className="suggested-target"><span>Perkiraan dari profil</span><strong>{number(suggestedTarget(profile))} <small>kkal/hari</small></strong></div><Field label="Target pilihanmu (kkal/hari)"><input type="number" min="1000" max="6000" value={profile.calorieTarget} onChange={(event) => { setTargetEdited(true); setProfile({ ...profile, calorieTarget: Number(event.target.value) }); }} /></Field><button className="text-button" onClick={() => { setProfile((current) => ({ ...current, calorieTarget: suggestedTarget(current) })); setTargetEdited(false); }}>Gunakan perkiraan <ArrowRight size={16} /></button>{targetEdited && <p className="saved-hint"><Check size={15} /> Target pilihanmu tersimpan otomatis di perangkat ini.</p>}<div className="formula-note"><CircleHelp size={18} /><p>Perkiraan memakai rumus Mifflin–St Jeor dan faktor aktivitas 1,2–1,65; tujuan turun −300 kkal, naik +250 kkal. Ini bukan saran medis. Kamu bisa mengubah target kapan saja.</p></div></section></div><section className="panel account-panel"><span className="card-kicker">AKUN</span><h2>{accountId ? "Tersambung ke Supabase" : "Simpan lintas perangkat"}</h2>{accountId ? <><p>{accountEmail}</p><button className="outline-button" onClick={() => getSupabaseBrowser()?.auth.signOut()}>Keluar dari akun</button></> : supabaseConfigured ? <form className="account-form" onSubmit={signIn}><p>Masuk dengan tautan email. Catatan demo tetap terpisah dari akunmu.</p><input type="email" required placeholder="Email kamu" value={signInEmail} onChange={(event) => setSignInEmail(event.target.value)} /><button className="primary-button" type="submit">Kirim tautan masuk</button></form> : <p>Mode demo aktif. Tambahkan URL proyek dan publishable key ke .env.local untuk mengaktifkan masuk dengan email.</p>}</section><section className="panel privacy-panel"><div><span className="card-kicker">DATA & PRIVASI</span><h2>{accountId ? "Data akun" : "Mode demo lokal"}</h2><p>{accountId ? "Catatan akunmu disimpan di Supabase. Foto tidak disimpan." : "Catatan demo berada di penyimpanan browser perangkat ini. Foto tidak disimpan."}</p><p>Untuk memasang Porsi: di iPhone gunakan Bagikan → Tambahkan ke Layar Utama; di Android pilih Instal aplikasi pada menu browser.</p></div><button className="outline-button danger-text" onClick={removeAllData}><Trash2 size={17} /> {accountId ? "Hapus data akun" : "Hapus semua data"}</button></section></>}
      </div>
    </main>
    <button className="floating-add" onClick={() => openEditor("manual")} aria-label="Catat makanan"><Plus size={24} /><span>Catat makanan</span></button>
    <nav className="bottom-nav" aria-label="Navigasi bawah"><NavButton active={tab === "beranda"} icon={<Home size={21} />} label="Beranda" onClick={() => setTab("beranda")} /><NavButton active={tab === "riwayat"} icon={<ClipboardList size={21} />} label="Riwayat" onClick={() => setTab("riwayat")} /><span className="nav-space" /><NavButton active={tab === "progres"} icon={<TrendingUp size={21} />} label="Progres" onClick={() => setTab("progres")} /><NavButton active={tab === "profil"} icon={<UserRound size={21} />} label="Profil" onClick={() => setTab("profil")} /></nav>
    {installPrompt && <button className="install-button" onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}>Pasang Porsi di perangkat <ArrowRight size={15} /></button>}
    {editor && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}><section className="editor" role="dialog" aria-modal="true" aria-label="Catat makanan"><div className="editor-head"><div><span className="eyebrow">CATAT MAKANAN</span><h2>{editor === "foto" ? "Analisis foto" : editor === "tersimpan" ? "Makanan tersimpan" : "Tambah makanan"}</h2></div><button className="icon-button" onClick={() => setEditor(null)} aria-label="Tutup"><X size={21} /></button></div><div className="editor-scroll"><div className="editor-tabs"><button className={editor === "manual" ? "active" : ""} onClick={() => setEditor("manual")}><Search size={17} /> Cari manual</button><button className={editor === "foto" ? "active" : ""} onClick={() => setEditor("foto")}><Camera size={17} /> Foto</button><button className={editor === "tersimpan" ? "active" : ""} onClick={() => setEditor("tersimpan")}><Bookmark size={17} /> Tersimpan</button></div>
      {editor === "foto" && <div className="photo-panel"><label className="upload-box"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => analyzePhoto(event.target.files?.[0])} /><span className="upload-icon"><Upload size={24} /></span><strong>{analyzing ? "Sedang melihat foto..." : photoName || "Ambil atau pilih foto makanan"}</strong><small>JPEG, PNG, atau WebP · maksimal 8 MB</small></label><p className="microcopy">Foto dikompresi dan metadata dihapus. Kamu bisa mencoba 3 analisis per hari tanpa akun; masuk untuk menyimpan lintas perangkat.</p>{analysisError && <div className="error-message" role="alert">{analysisError} <button onClick={() => { setEditor("manual"); setSearchOpen(true); }}>Cari manual</button></div>}{analysis && <div className="analysis-result"><div className="analysis-label"><Sparkles size={17} /> KANDIDAT DARI FOTO</div><p>{analysis.disclaimer}</p>{analysis.items.map((item, index) => <div className="candidate" key={index}><strong>{item.candidateName}</strong><span>{item.estimatedServing.gramsMin}–{item.estimatedServing.gramsMax} g · keyakinan {item.confidence === "high" ? "tinggi" : item.confidence === "low" ? "rendah" : "sedang"}</span><small>{item.visibleNotes}</small></div>)}{unmatchedCandidates.map((name) => <div className="unmatched" key={name}><strong>{name}</strong><span>Belum ada padanan pasti di katalog. Pilih makanan serupa atau abaikan jika tidak dimakan.</span><div><button className="text-button" onClick={() => { setSearchOpen(true); setQuery(""); }}>Cari padanan</button><button className="text-button" onClick={() => setUnmatchedCandidates((current) => current.filter((item) => item !== name))}>Sudah ditangani</button></div></div>)}{analysis.followUpQuestion && <div className="followup"><label htmlFor="followup-answer">{analysis.followUpQuestion}</label><input id="followup-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Contoh: ayamnya digoreng" />{photoFile && <button className="text-button" onClick={() => analyzePhoto(photoFile)} disabled={analyzing || !answer.trim()}>Analisis ulang dengan jawaban <ArrowRight size={15} /></button>}</div>}<label className="review-confirm"><input type="checkbox" checked={analysisConfirmed} onChange={(event) => setAnalysisConfirmed(event.target.checked)} /> Saya sudah memeriksa dan menyesuaikan makanan serta porsinya.</label></div>}</div>}
      {editor === "tersimpan" && <div className="saved-panel"><h3>Kombinasi tersimpan</h3>{savedMeals.length ? savedMeals.map((meal) => <button className="saved-row" key={meal.id} onClick={() => { setDraft(cloneItems(meal.items)); setMealTitle(meal.title); setEditor("manual"); }}><span><strong>{meal.title}</strong><small>{meal.items.length} makanan · {number(total(meal.items).calories)} kkal</small></span><ArrowRight size={17} /></button>) : <p className="empty-inline">Belum ada kombinasi tersimpan. Setelah menambahkan makanan, gunakan “Simpan kombinasi”.</p>}<h3>Baru dicatat</h3>{recentMeals.length ? recentMeals.map((meal) => <button className="saved-row" key={meal.id} onClick={() => { setDraft(cloneItems(meal.items)); setMealTitle(meal.title); setEditor("manual"); }}><span><strong>{meal.title}</strong><small>{formatDate(meal.date)} · {number(total(meal.items).calories)} kkal</small></span><ArrowRight size={17} /></button>) : <p className="empty-inline">Belum ada makanan baru-baru ini.</p>}</div>}
      {(editor === "manual" || editor === "foto") && <><div className="editor-fields"><Field label="Jenis makan"><select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>{mealTypes.map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Tanggal"><input type="date" value={mealDate} onChange={(event) => setMealDate(event.target.value)} required /></Field><Field label="Jam"><input type="time" value={mealTime} onChange={(event) => setMealTime(event.target.value)} required /></Field><Field label="Nama catatan (opsional)"><input value={mealTitle} onChange={(event) => setMealTitle(event.target.value)} placeholder="Contoh: Makan siang di warteg" /></Field></div><div className="draft-heading"><div><h3>Periksa makanan & porsi</h3><p>Semua angka di bawah adalah perkiraan dari data per 100 g.</p></div></div>{draft.length ? <div className="draft-list">{draft.map((item) => <div className="draft-item" key={item.id}><div className="draft-item-top"><div className="food-badge">{item.foodId === "nasi" ? "🍚" : item.foodId?.includes("ayam") ? "🍗" : item.foodId === "sayur" ? "🥬" : "🍽️"}</div><div className="draft-item-name"><label htmlFor={`name-${item.id}`}>Nama makanan</label><input id={`name-${item.id}`} value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} /><small>{item.source}</small></div><button onClick={() => setDraft((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Hapus ${item.name}`} className="icon-button"><X size={18} /></button></div><div className="portion-row"><Field label="Jumlah"><input type="number" min="0.1" step="0.1" value={item.quantity} onChange={(event) => { const quantity = Number(event.target.value); updateItem(item.id, { quantity, grams: quantity * item.gramsPerUnit }); }} /></Field><Field label="Satuan"><select value={item.unit} onChange={(event) => setDraft((current) => current.map((entry) => entry.id === item.id ? changeServing(entry, event.target.value) : entry))}>{foods.find((record) => record.id === item.foodId)?.servings.map((serving) => <option key={serving.unit}>{serving.unit}</option>)}<option value="gram">gram</option></select></Field><div className="portion-grams">≈ {number(item.grams)} g</div></div><div className="item-nutrition"><strong>{number(nutrientsFor(item).calories)} kkal</strong><span>P {number(nutrientsFor(item).protein)} · K {number(nutrientsFor(item).carbs)} · L {number(nutrientsFor(item).fat)} g</span></div></div>)}</div> : <div className="empty-draft"><UtensilsCrossed size={24} /><span>Belum ada makanan. Cari di katalog contoh atau buat entri sendiri.</span></div>}
      <button className="add-food-button" onClick={() => { setSearchOpen(!searchOpen); setCustomOpen(false); }}><Plus size={17} /> Tambah makanan</button>{searchOpen && <div className="food-search"><label className="search-input"><Search size={18} /><input autoFocus placeholder="Cari nasi, ayam, tempe..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="food-results">{filteredFoods.map((food) => <button key={food.id} onClick={() => addFood(food)}><span><strong>{food.name}</strong><small>{food.category} · {food.source}</small></span><span>{number(food.per100g.calories)} kkal / 100 g <Plus size={16} /></span></button>)}{!filteredFoods.length && <p className="empty-inline">Tidak ada yang cocok. Kamu bisa membuat entri sendiri dari label gizi.</p>}</div><button className="text-button" onClick={() => { setCustomOpen(true); setSearchOpen(false); }}><Plus size={16} /> Buat makanan sendiri</button></div>}{customOpen && <div className="custom-form"><h4>Makanan sendiri</h4><p>Isi nilai dari label atau sumber yang kamu percaya, per 100 gram.</p><Field label="Nama makanan"><input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Contoh: Sup buatan rumah" /></Field><div className="custom-grid"><Field label="Kalori"><input type="number" min="0" value={customCalories} onChange={(event) => setCustomCalories(event.target.value)} /></Field><Field label="Protein (g)"><input type="number" min="0" value={customProtein} onChange={(event) => setCustomProtein(event.target.value)} /></Field><Field label="Karbo (g)"><input type="number" min="0" value={customCarbs} onChange={(event) => setCustomCarbs(event.target.value)} /></Field><Field label="Lemak (g)"><input type="number" min="0" value={customFat} onChange={(event) => setCustomFat(event.target.value)} /></Field></div><button className="primary-button" onClick={addCustom}>Tambahkan</button></div>}</>}
      </div><div className="editor-footer"><div className="draft-total"><small>TOTAL PERKIRAAN</small><strong>{number(total(draft).calories)} <span>kkal</span></strong><span className="draft-macros">Protein {number(total(draft).protein)} g / Karbo {number(total(draft).carbs)} g / Lemak {number(total(draft).fat)} g</span></div><div className="footer-buttons"><button className="outline-button save-combo" onClick={saveCombination} disabled={!draft.length || Boolean(analysis && (!analysisConfirmed || unmatchedCandidates.length))}><Bookmark size={17} /> Simpan kombinasi</button><button className="primary-button" onClick={saveMeal} disabled={!draft.length || saving || storageMode === "loading" || storageMode === "error" || Boolean(analysis && (!analysisConfirmed || unmatchedCandidates.length))}><Check size={18} /> {saving ? "Menyimpan..." : "Simpan catatan"}</button></div></div></section></div>}
  </div>;
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}>{icon}<span>{label}</span></button>; }
function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) { return <div className="macro"><div className="macro-head"><span><i className={`macro-dot ${color}`} />{label}</span><strong>{number(value)} <small>/ {number(target)} g</small></strong></div><div className="progress-track"><div className={`progress-fill ${color}`} style={{ width: `${Math.min(value / Math.max(target, 1) * 100, 100)}%` }} /></div></div>; }
function PageIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function EmptyState({ icon, title, description, action, onAction }: { icon: React.ReactNode; title: string; description: string; action: string; onAction: () => void }) { return <div className="empty-state"><span>{icon}</span><h2>{title}</h2><p>{description}</p><button className="primary-button" onClick={onAction}>{action}</button></div>; }
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d"); if (!context) throw new Error("Foto tidak dapat diproses. Coba file lain.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Foto tidak dapat diproses.")), "image/jpeg", .8));
}
