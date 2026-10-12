"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { deleteAllAccountData, deleteMeal as deleteRemoteMeal, deleteSavedMeal as deleteRemoteSavedMeal, deleteWeight as deleteRemoteWeight, importDemoMeal, importDemoSavedMeal, importDemoWeights, insertFoodCorrections, insertMeal as insertRemoteMeal, insertSavedMeal, loadAccountData, saveCalorieTarget, saveProfileWithWeight, updateSavedMeal } from "@/lib/supabase/data";
import ProfileView from "./ProfileView";
import SavedMealLibrary from "./SavedMealLibrary";
import SavedMealForm from "./SavedMealForm";
import FoodShortcuts from "./FoodShortcuts";
import PhotoReview, { type Analysis } from "./PhotoReview";
import WeeklyProgress from "./WeeklyProgress";
import { copyMealItems, correctionsFromReview, frequentFoodShortcuts, recentFoodShortcuts, savedMealError, type FoodCorrection } from "@/lib/meal-memory";
import { addCalendarDays, mondayOf, summarizeWeek, todayInTimeZone } from "@/lib/weekly-progress";
import { activeTarget, addTargetRecord, profileError, putWeightRecord, validTarget, type TargetRecord } from "@/lib/target";
import { Activity, ArrowRight, Bookmark, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Flame, Home, Info, Leaf, MoreHorizontal, Plus, Search, Sparkles, Trash2, TrendingUp, Upload, UserRound, UtensilsCrossed, WifiOff, X } from "lucide-react";
import { changeServing, defaultProfile, editMealItem, foods, itemFromFood, matchCandidateFood, mealTypes, nutrientsFor, total, type Food, type Meal, type MealItem, type MealType, type Profile, type SavedMeal, type WeightEntry } from "@/lib/food";

type Tab = "beranda" | "riwayat" | "progres" | "profil";
type EditorMode = "manual" | "foto" | "tersimpan";
const STORAGE = "porsi-demo-v1";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", options ?? { weekday: "long", day: "numeric", month: "long" });
const number = (value: number) => Math.round(value).toLocaleString("id-ID");
const cloneItems = copyMealItems;

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("beranda");
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayInTimeZone()));
  const [date, setDate] = useState(today);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [corrections, setCorrections] = useState<FoodCorrection[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [targets, setTargets] = useState<TargetRecord[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [canImport, setCanImport] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [mealType, setMealType] = useState<MealType>("Makan siang");
  const [mealDate, setMealDate] = useState(today);
  const [mealTime, setMealTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [draft, setDraft] = useState<MealItem[]>([]);
  const [mealTitle, setMealTitle] = useState("");
  const [entryFromSaved, setEntryFromSaved] = useState(false);
  const [savedFormOpen, setSavedFormOpen] = useState(false);
  const [savedEditingId, setSavedEditingId] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [savedCategory, setSavedCategory] = useState<MealType | null>(null);
  const [savingSaved, setSavingSaved] = useState(false);
  const [deletingSavedId, setDeletingSavedId] = useState<string | null>(null);
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
  const [unmatchedCandidates, setUnmatchedCandidates] = useState<number[]>([]);
  const [ignoredCandidates, setIgnoredCandidates] = useState<number[]>([]);
  const [analysisSelections, setAnalysisSelections] = useState<Record<number, string>>({});
  const [analysisInitialFoodIds, setAnalysisInitialFoodIds] = useState<Record<number, string | null>>({});
  const [analysisAliases, setAnalysisAliases] = useState<Record<number, string>>({});
  const [analysisError, setAnalysisError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [answer, setAnswer] = useState("");
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [message, setMessage] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
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
        setCorrections(Array.isArray(data.corrections) ? data.corrections : []);
        setWeights(Array.isArray(data.weights) ? data.weights : []);
        setTargets(Array.isArray(data.targets) ? data.targets : []);
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
  useEffect(() => { if (ready && storageMode === "local") localStorage.setItem(STORAGE, JSON.stringify({ profile, meals, savedMeals, corrections, weights, targets })); }, [ready, storageMode, profile, meals, savedMeals, corrections, weights, targets]);
  useEffect(() => { if (savedFormOpen) requestAnimationFrame(() => document.querySelector(".saved-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" })); }, [savedFormOpen, editor]);
  useEffect(() => { if (!message) return; const timeout = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(timeout); }, [message]);
  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { setRecoveryMode(true); setTab("profil"); }
      if (session?.user) {
        setAccountId(session.user.id); setAccountEmail(session.user.email ?? ""); setStorageMode("loading");
      } else if (event === "SIGNED_OUT") {
        setAccountId(null); setAccountEmail(""); setStorageMode("loading");
        try {
          const local = JSON.parse(localStorage.getItem(STORAGE) ?? "{}");
          setProfile(local.profile ?? defaultProfile); setMeals(local.meals ?? []); setSavedMeals(local.savedMeals ?? []); setCorrections(local.corrections ?? []); setWeights(local.weights ?? []); setTargets(local.targets ?? []);
        } catch { setProfile(defaultProfile); setMeals([]); setSavedMeals([]); setCorrections([]); setWeights([]); setTargets([]); }
        setHasProfile(false); setCanImport(false); setRecoveryMode(false);
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
      setProfile(data.profile); setMeals(data.meals); setSavedMeals(data.savedMeals); setCorrections(data.corrections); setWeights(data.weights); setTargets(data.targets); setHasProfile(data.hasProfile);
      try {
        const local = JSON.parse(localStorage.getItem(STORAGE) ?? "{}");
        const pending = Boolean(localStorage.getItem(`porsi-import-pending-${accountId}`));
        setCanImport(!localStorage.getItem(`porsi-imported-${accountId}`) && (pending || (!data.hasProfile && data.meals.length === 0 && Array.isArray(local.meals) && local.meals.length > 0)));
      } catch { setCanImport(false); }
      setStorageMode("account");
    }).catch(() => { if (!cancelled) { setStorageMode("error"); setMessage("Data akun belum bisa dimuat. Periksa migrasi dan koneksi Supabase."); } });
    return () => { cancelled = true; };
  }, [accountId, storageMode]);
  const dayMeals = useMemo(() => meals.filter((meal) => meal.date === date), [meals, date]);
  const dayTotal = useMemo(() => total(dayMeals.flatMap((meal) => meal.items)), [dayMeals]);
  const target = activeTarget(targets)?.calories ?? profile.calorieTarget;
  const remaining = target - dayTotal.calories;
  const filteredFoods = useMemo(() => foods.filter((food) => `${food.name} ${food.aliases.join(" ")}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [query]);
  const recentMeals = useMemo(() => [...meals].sort((a, b) => (b.eatenAt ?? b.createdAt).localeCompare(a.eatenAt ?? a.createdAt)).slice(0, 5), [meals]);
  const recentFoods = useMemo(() => recentFoodShortcuts(meals), [meals]);
  const frequentFoods = useMemo(() => frequentFoodShortcuts(meals), [meals]);
  const analysisNeedsReview = Boolean(analysis && (!analysisConfirmed || unmatchedCandidates.length || analysis.items.some((_, index) => !ignoredCandidates.includes(index) && !draft.some((item) => item.id === analysisSelections[index]))));
  const weeklySummary = useMemo(() => summarizeWeek(weekStart, meals, targets, weights, todayInTimeZone()), [weekStart, meals, targets, weights]);

  function openEditor(mode: EditorMode, items: MealItem[] = [], title = "") {
    setEditor(mode); setDraft(cloneItems(items)); setMealTitle(title); setMealDate(date); setMealTime(new Date().toTimeString().slice(0, 5)); setQuery(""); setAnalysis(null); setAnalysisConfirmed(false); setUnmatchedCandidates([]); setIgnoredCandidates([]); setAnalysisSelections({}); setAnalysisInitialFoodIds({}); setAnalysisAliases({}); setAnalysisError(""); setPhotoName(""); setPhotoFile(null); setAnswer(""); setSearchOpen(mode === "manual" && items.length === 0); setCustomOpen(false); setEntryFromSaved(false); setSavedFormOpen(false); setSavedEditingId(null); setSavedTitle(""); setSavedNote(""); setSavedCategory(null);
  }
  function addFood(food: Food) { setDraft((current) => [...current, itemFromFood(food)]); setAnalysisConfirmed(false); setSearchOpen(false); setQuery(""); }
  function addShortcutFood(item: MealItem) {
    if (editor === "tersimpan") openEditor("manual", [item]);
    else { setDraft((current) => [...current, ...cloneItems([item])]); setAnalysisConfirmed(false); }
  }
  function useSavedMeal(saved: SavedMeal) {
    openEditor("manual", saved.items, saved.title);
    if (saved.category) setMealType(saved.category);
    setEntryFromSaved(true);
  }
  function editSavedCombination(saved: SavedMeal) {
    openEditor("manual", saved.items, saved.title);
    setSavedFormOpen(true); setSavedEditingId(saved.id); setSavedTitle(saved.title);
    setSavedNote(saved.note ?? ""); setSavedCategory(saved.category ?? null);
  }
  function startSavedCombination() {
    setSavedFormOpen(true); setSavedEditingId(null);
    setSavedTitle(mealTitle.trim() || draft.map((item) => item.name).slice(0, 2).join(" & "));
    setSavedNote(""); setSavedCategory(mealType);
  }
  function updateItem(id: string, patch: Partial<MealItem>) { setDraft((current) => editMealItem(current, id, patch)); setAnalysisConfirmed(false); }
  function removeDraftItem(id: string) {
    setDraft((current) => current.filter((item) => item.id !== id)); setAnalysisConfirmed(false);
    if (analysis) {
      const affected = Object.entries(analysisSelections).filter(([, selectedId]) => selectedId === id).map(([index]) => Number(index));
      if (affected.length) {
        setAnalysisSelections((current) => Object.fromEntries(Object.entries(current).filter(([index]) => !affected.includes(Number(index)))));
        setUnmatchedCandidates((current) => [...new Set([...current, ...affected])]);
        setIgnoredCandidates((current) => current.filter((index) => !affected.includes(index)));
      }
    }
  }
  function selectCandidate(index: number, itemId: string) {
    setAnalysisSelections((current) => { const next = { ...current }; if (itemId) next[index] = itemId; else delete next[index]; return next; });
    if (analysis) setUnmatchedCandidates((current) => itemId ? current.filter((value) => value !== index) : [...new Set([...current, index])]);
    setIgnoredCandidates((current) => current.filter((value) => value !== index));
    setAnalysisConfirmed(false);
  }
  function ignoreCandidate(index: number) {
    const selectedId = analysisSelections[index];
    if (selectedId && !Object.entries(analysisSelections).some(([otherIndex, id]) => Number(otherIndex) !== index && id === selectedId)) {
      setDraft((current) => current.filter((item) => item.id !== selectedId));
    }
    setUnmatchedCandidates((current) => current.filter((value) => value !== index));
    setIgnoredCandidates((current) => [...new Set([...current, index])]);
    setAnalysisSelections((current) => { const next = { ...current }; delete next[index]; return next; });
    setAnalysisConfirmed(false);
  }
  function applyPersonalCorrection(index: number, correction: FoodCorrection) {
    const item = cloneItems([correction.item])[0];
    item.corrected = true;
    const previousId = analysisSelections[index];
    setDraft((current) => previousId && current.some((entry) => entry.id === previousId) ? current.map((entry) => entry.id === previousId ? item : entry) : [...current, item]);
    selectCandidate(index, item.id);
    setAnalysisAliases((current) => ({ ...current, [index]: correction.alias }));
  }
  function applyPersonalSaved(index: number, saved: SavedMeal) {
    const items = cloneItems(saved.items);
    if (!items.length) return;
    const previousId = analysisSelections[index];
    setDraft((current) => previousId ? [...current.filter((entry) => entry.id !== previousId), ...items] : [...current, ...items]);
    selectCandidate(index, items[0].id);
  }
  async function saveMeal() {
    if (!draft.length) { setMessage("Tambahkan setidaknya satu makanan."); return; }
    if (analysisNeedsReview) { setMessage("Periksa semua kandidat foto dan konfirmasi sebelum menyimpan."); return; }
    if (draft.some((item) => !item.name.trim() || item.grams <= 0 || !Number.isFinite(item.grams))) { setMessage("Periksa nama dan porsi makanan."); return; }
    const eatenAt = new Date(`${mealDate}T${mealTime}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate) || !/^\d{2}:\d{2}$/.test(mealTime) || Number.isNaN(eatenAt.getTime())) { setMessage("Periksa tanggal dan waktu makan."); return; }
    const title = mealTitle.trim() || draft.map((item) => item.name).slice(0, 2).join(" & ");
    const meal: Meal = { id: crypto.randomUUID(), date: mealDate, eatenAt: eatenAt.toISOString(), type: mealType, title, method: editor === "foto" ? "foto" : entryFromSaved ? "tersimpan" : "manual", items: cloneItems(draft), createdAt: new Date().toISOString() };
    const newCorrections = analysis ? correctionsFromReview(analysis.items, analysisSelections, analysisInitialFoodIds, analysisAliases, draft, meal.createdAt) : [];
    let correctionFailed = false;
    if (accountId) {
      if (storageMode !== "account") { setMessage("Tunggu data akun siap sebelum menyimpan."); return; }
      const client = getSupabaseBrowser(); if (!client) return;
      setSaving(true);
      try {
        await insertRemoteMeal(client, accountId, meal);
        if (newCorrections.length) {
          try { await insertFoodCorrections(client, accountId, newCorrections); }
          catch { correctionFailed = true; }
        }
      }
      catch { setMessage("Makanan belum tersimpan ke akun. Periksa koneksi dan coba lagi."); setSaving(false); return; }
      setSaving(false);
    }
    if (newCorrections.length && !correctionFailed) setCorrections((current) => [...newCorrections, ...current].slice(0, 200));
    setMeals((current) => [meal, ...current]); setDate(mealDate); setEditor(null); setTab("beranda"); setMessage(correctionFailed ? "Makanan tersimpan, tetapi koreksi belum dapat diingat. Periksa koneksi." : "Makanan tersimpan. Kamu bisa mengubahnya kapan saja.");
  }
  async function saveCombination() {
    const error = savedMealError(savedTitle, savedNote, draft);
    if (error) { setMessage(error); return; }
    if (analysisNeedsReview) { setMessage("Periksa dan konfirmasi kandidat foto sebelum menyimpan kombinasi."); return; }
    const previous = savedEditingId ? savedMeals.find((entry) => entry.id === savedEditingId) : undefined;
    if (savedEditingId && !previous) { setMessage("Kombinasi tidak ditemukan. Buka lagi dari daftar tersimpan."); return; }
    const now = new Date().toISOString();
    const saved: SavedMeal = { id: previous?.id ?? crypto.randomUUID(), title: savedTitle.trim(), note: savedNote.trim(), category: savedCategory, items: cloneItems(draft), createdAt: previous?.createdAt ?? now, updatedAt: now };
    const newCorrections = analysis ? correctionsFromReview(analysis.items, analysisSelections, analysisInitialFoodIds, analysisAliases, draft, now) : [];
    let correctionFailed = false;
    if (accountId) {
      if (storageMode !== "account") { setMessage("Tunggu data akun siap."); return; }
      const client = getSupabaseBrowser(); if (!client) return;
      setSavingSaved(true);
      try {
        if (previous) await updateSavedMeal(client, accountId, saved); else await insertSavedMeal(client, accountId, saved);
        if (newCorrections.length) {
          try { await insertFoodCorrections(client, accountId, newCorrections); }
          catch { correctionFailed = true; }
        }
      }
      catch { setMessage("Kombinasi belum tersimpan. Coba lagi."); setSavingSaved(false); return; }
      setSavingSaved(false);
    }
    setSavedMeals((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]);
    if (newCorrections.length && !correctionFailed) setCorrections((current) => [...newCorrections, ...current].slice(0, 200));
    setSavedFormOpen(false); setSavedEditingId(null); setEntryFromSaved(true);
    setMessage(correctionFailed ? "Kombinasi tersimpan, tetapi koreksi foto belum dapat diingat." : previous ? "Kombinasi diperbarui. Catatan makan lama tetap sama." : "Kombinasi disimpan untuk lain kali.");
  }
  function saveExistingCombination(meal: Meal) {
    openEditor("manual", meal.items, meal.title);
    setMealType(meal.type); setSavedFormOpen(true); setSavedTitle(meal.title); setSavedCategory(meal.type);
  }
  async function removeSavedCombination(saved: SavedMeal) {
    if (!confirm(`Hapus kombinasi "${saved.title}"? Catatan makan yang sudah ada tetap tersimpan.`)) return;
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      setDeletingSavedId(saved.id);
      try { await deleteRemoteSavedMeal(client, accountId, saved.id); }
      catch { setMessage("Kombinasi belum terhapus. Coba lagi."); setDeletingSavedId(null); return; }
    }
    setSavedMeals((current) => current.filter((entry) => entry.id !== saved.id));
    setDeletingSavedId(null);
    if (savedEditingId === saved.id) { setSavedFormOpen(false); setSavedEditingId(null); }
    setMessage("Kombinasi dihapus. Catatan makan lama tetap sama.");
  }
  async function removeMeal(id: string) {
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      try { await deleteRemoteMeal(client, accountId, id); } catch { setMessage("Catatan belum terhapus dari akun. Coba lagi."); return; }
    }
    setMeals((current) => current.filter((meal) => meal.id !== id)); setMessage("Catatan dihapus.");
  }
  async function recordWeight(weight: number) {
    const entry = { id: weights.find((item) => item.date === today())?.id ?? crypto.randomUUID(), date: today(), weight };
    const nextProfile = { ...profile, weight };
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return false;
      if (!hasProfile) { setMessage("Simpan profil dahulu sebelum mencatat berat."); setTab("profil"); return false; }
      try {
        await saveProfileWithWeight(client, nextProfile, entry.date, true);
        const data = await loadAccountData(client, accountId);
        setWeights(data.weights); setProfile(data.profile);
      } catch { setMessage("Berat belum tersimpan ke akun. Periksa koneksi dan coba lagi."); return false; }
    } else {
      setWeights((current) => putWeightRecord(current, entry)); setProfile(nextProfile);
    }
    setMessage("Berat badan tersimpan."); return true;
  }
  async function removeWeight(id: string) {
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      try { await deleteRemoteWeight(client, id); const data = await loadAccountData(client, accountId); setWeights(data.weights); setProfile(data.profile); } catch { setMessage("Catatan berat belum terhapus."); return; }
    } else {
      const next = weights.filter((item) => item.id !== id);
      setWeights(next);
      if (next.length) setProfile((current) => ({ ...current, weight: [...next].sort((a, b) => b.date.localeCompare(a.date))[0].weight }));
    }
  }
  async function saveProfile(profileDraft: Profile) {
    const error = profileError(profileDraft);
    if (error || !validTarget(profileDraft.calorieTarget)) throw new Error(error ?? "Target tidak valid.");
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") throw new Error("Data akun belum siap.");
      await saveProfileWithWeight(client, profileDraft, today());
      const data = await loadAccountData(client, accountId);
      setWeights(data.weights); setProfile(data.profile); setHasProfile(true);
    } else {
      if (profileDraft.weight !== profile.weight) setWeights((current) => putWeightRecord(current, { id: current.find((item) => item.date === today())?.id ?? crypto.randomUUID(), date: today(), weight: profileDraft.weight }));
      setProfile(profileDraft);
    }
  }
  async function saveTarget(record: TargetRecord) {
    if (!validTarget(record.calories)) throw new Error("Target tidak valid.");
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") throw new Error("Data akun belum siap.");
      await saveCalorieTarget(client, record);
    }
    setTargets((current) => addTargetRecord(current, record));
    setProfile((current) => ({ ...current, calorieTarget: record.calories }));
  }
  async function importDemo() {
    if (!accountId || !canImport || storageMode !== "account") throw new Error("Impor tidak tersedia.");
    const client = getSupabaseBrowser(); if (!client) throw new Error("Supabase tidak tersedia.");
    const local = JSON.parse(localStorage.getItem(STORAGE) ?? "{}");
    const importedProfile = local.profile as Profile | undefined;
    if (!importedProfile || profileError(importedProfile) || !validTarget(importedProfile.calorieTarget)) throw new Error("Profil demo tidak valid.");
    localStorage.setItem(`porsi-import-pending-${accountId}`, "true");
    const mappingKey = `porsi-import-ids-${accountId}`;
    const idMap = JSON.parse(localStorage.getItem(mappingKey) ?? "{}") as Record<string, string>;
    const importId = (kind: string, id: string) => {
      const key = `${kind}:${id}`;
      if (!idMap[key]) { idMap[key] = crypto.randomUUID(); localStorage.setItem(mappingKey, JSON.stringify(idMap)); }
      return idMap[key];
    };
    await saveProfileWithWeight(client, importedProfile, today());
    const localTargets = Array.isArray(local.targets) ? local.targets as TargetRecord[] : [];
    const records = localTargets.length ? [...localTargets].sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt)) : [{ id: crypto.randomUUID(), calories: importedProfile.calorieTarget, source: "manual" as const, formulaVersion: null, inputs: null, effectiveAt: new Date().toISOString(), createdAt: new Date().toISOString(), note: "Diimpor dari demo" }];
    if (!localTargets.length) { local.targets = records; localStorage.setItem(STORAGE, JSON.stringify(local)); }
    for (const record of records) await saveCalorieTarget(client, { ...record, id: importId("target", record.id) });
    for (const meal of (Array.isArray(local.meals) ? local.meals : []) as Meal[]) await importDemoMeal(client, accountId, { ...meal, id: importId("meal", meal.id), items: meal.items.map((item) => ({ ...item, id: importId("item", item.id) })) });
    for (const saved of (Array.isArray(local.savedMeals) ? local.savedMeals : []) as SavedMeal[]) await importDemoSavedMeal(client, accountId, { ...saved, id: importId("saved", saved.id) });
    const localCorrections = (Array.isArray(local.corrections) ? local.corrections : []) as FoodCorrection[];
    if (localCorrections.length) await insertFoodCorrections(client, accountId, localCorrections.map((entry) => ({ ...entry, id: importId("correction", entry.id) })));
    await importDemoWeights(client, accountId, ((Array.isArray(local.weights) ? local.weights : []) as WeightEntry[]).map((entry) => ({ ...entry, id: importId("weight", entry.id) })));
    const data = await loadAccountData(client, accountId);
    setProfile(data.profile); setMeals(data.meals); setSavedMeals(data.savedMeals); setCorrections(data.corrections); setWeights(data.weights); setTargets(data.targets); setHasProfile(true); setCanImport(false);
    localStorage.setItem(`porsi-imported-${accountId}`, "true");
    localStorage.removeItem(`porsi-import-pending-${accountId}`);
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
    setMeals([]); setSavedMeals([]); setCorrections([]); setWeights([]); setTargets([]); setProfile(defaultProfile); setMessage("Data catatan telah dihapus.");
  }
  function addCustom() {
    const calories = Number(customCalories), protein = Number(customProtein), carbs = Number(customCarbs), fat = Number(customFat);
    if (!customName.trim() || [calories, protein, carbs, fat].some((value) => !Number.isFinite(value) || value < 0)) { setMessage("Isi nama dan nilai gizi per 100 g dengan angka yang valid."); return; }
    setDraft((current) => [...current, { id: crypto.randomUUID(), foodId: null, name: customName.trim(), quantity: 100, unit: "gram", gramsPerUnit: 1, grams: 100, per100g: { calories, protein, carbs, fat }, source: "Diisi pengguna", corrected: true }]);
    setAnalysisConfirmed(false); setCustomOpen(false); setSearchOpen(false); setCustomName(""); setCustomCalories(""); setCustomProtein(""); setCustomCarbs(""); setCustomFat("");
  }
  async function analyzePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoName(file.name); setPhotoFile(file); setAnalysisError(""); setAnalysis(null); setAnalysisConfirmed(false); setUnmatchedCandidates([]); setIgnoredCandidates([]); setAnalysisSelections({}); setAnalysisInitialFoodIds({}); setAnalysisAliases({}); setDraft([]);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setAnalysisError("Gunakan foto JPEG, PNG, atau WebP."); return; }
    if (file.size > 8 * 1024 * 1024) { setAnalysisError("Foto terlalu besar. Pilih foto di bawah 8 MB."); return; }
    if (!online) { setAnalysisError("Sedang offline. Kamu tetap bisa menambahkan makanan secara manual."); return; }
    setAnalyzing(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > 4_000_000) throw new Error("Foto masih terlalu besar setelah dikompresi. Pilih foto lain.");
      const form = new FormData(); form.append("image", compressed); if (answer.trim()) form.append("context", answer.trim());
      const session = await getSupabaseBrowser()?.auth.getSession();
      const accessToken = session?.data.session?.access_token;
      let response = await fetch("/api/meal/analyze", { method: "POST", body: form, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined });
      if (response.status === 401 && accessToken) response = await fetch("/api/meal/analyze", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analisis belum tersedia.");
      setAnalysis(result);
      const matched = result.items.map((candidate: Analysis["items"][number], index: number) => {
        const food = matchCandidateFood(candidate.candidateName);
        if (!food) return null;
        const item = itemFromFood(food); const grams = Math.max(1, Math.round((candidate.estimatedServing.gramsMin + candidate.estimatedServing.gramsMax) / 2));
        return { index, item: { ...item, unit: "gram", gramsPerUnit: 1, quantity: grams, grams, corrected: false } };
      }).filter((entry: { index: number; item: MealItem } | null): entry is { index: number; item: MealItem } => entry !== null);
      setDraft(matched.map((entry: { index: number; item: MealItem }) => entry.item));
      setAnalysisSelections(Object.fromEntries(matched.map((entry: { index: number; item: MealItem }) => [entry.index, entry.item.id])));
      setAnalysisInitialFoodIds(Object.fromEntries(result.items.map((candidate: Analysis["items"][number], index: number) => [index, matchCandidateFood(candidate.candidateName)?.id ?? null])));
      setUnmatchedCandidates(result.items.flatMap((candidate: Analysis["items"][number], index: number) => matchCandidateFood(candidate.candidateName) ? [] : [index]));
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
        {tab === "progres" && <WeeklyProgress summary={weeklySummary} currentWeek={weekStart >= mondayOf(todayInTimeZone())} loading={!ready || storageMode === "loading"} error={storageMode === "error"} allWeights={weights} onPrevious={() => setWeekStart((current) => addCalendarDays(current, -7))} onNext={() => setWeekStart((current) => { const next = addCalendarDays(current, 7); return next <= mondayOf(todayInTimeZone()) ? next : current; })} onOpenDate={(selectedDate) => { setDate(selectedDate); setTab("beranda"); }} onRetry={() => setStorageMode("loading")} onSaveWeight={recordWeight} onRemoveWeight={removeWeight} />}
        {tab === "profil" && <ProfileView profile={profile} targets={targets} accountId={accountId} accountEmail={accountEmail} storageMode={storageMode} supabaseConfigured={supabaseConfigured} hasProfile={hasProfile} canImport={canImport} recoveryMode={recoveryMode} onRecovered={() => setRecoveryMode(false)} onSaveProfile={saveProfile} onSaveTarget={saveTarget} onImport={importDemo} onRemoveAll={() => void removeAllData()} />}
      </div>
    </main>
    <button className="floating-add" onClick={() => openEditor("manual")} aria-label="Catat makanan"><Plus size={24} /><span>Catat makanan</span></button>
    <nav className="bottom-nav" aria-label="Navigasi bawah"><NavButton active={tab === "beranda"} icon={<Home size={21} />} label="Beranda" onClick={() => setTab("beranda")} /><NavButton active={tab === "riwayat"} icon={<ClipboardList size={21} />} label="Riwayat" onClick={() => setTab("riwayat")} /><span className="nav-space" /><NavButton active={tab === "progres"} icon={<TrendingUp size={21} />} label="Progres" onClick={() => setTab("progres")} /><NavButton active={tab === "profil"} icon={<UserRound size={21} />} label="Profil" onClick={() => setTab("profil")} /></nav>
    {installPrompt && <button className="install-button" onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}>Pasang Porsi di perangkat <ArrowRight size={15} /></button>}
    {editor && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}><section className="editor" role="dialog" aria-modal="true" aria-label="Catat makanan"><div className="editor-head"><div><span className="eyebrow">CATAT MAKANAN</span><h2>{editor === "foto" ? "Analisis foto" : editor === "tersimpan" ? "Makanan tersimpan" : "Tambah makanan"}</h2></div><button className="icon-button" onClick={() => setEditor(null)} aria-label="Tutup"><X size={21} /></button></div><div className="editor-scroll"><div className="editor-tabs"><button className={editor === "manual" ? "active" : ""} onClick={() => { if (analysis) { setDraft([]); setMealTitle(""); setSearchOpen(true); setSavedFormOpen(false); setSavedEditingId(null); } setEditor("manual"); setAnalysis(null); setAnalysisConfirmed(false); setUnmatchedCandidates([]); setIgnoredCandidates([]); }}><Search size={17} /> Cari manual</button><button className={editor === "foto" ? "active" : ""} onClick={() => { setEditor("foto"); setSavedFormOpen(false); setSavedEditingId(null); }}><Camera size={17} /> Foto</button><button className={editor === "tersimpan" ? "active" : ""} onClick={() => { setEditor("tersimpan"); setSavedFormOpen(false); setSavedEditingId(null); }}><Bookmark size={17} /> Tersimpan</button></div>
      {editor === "foto" && <div className="photo-panel"><label className="upload-box"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => analyzePhoto(event.target.files?.[0])} /><span className="upload-icon"><Upload size={24} /></span><strong>{analyzing ? "Sedang melihat foto..." : photoName || "Ambil atau pilih foto makanan"}</strong><small>JPEG, PNG, atau WebP - maksimal 8 MB</small></label><p className="microcopy">Foto dikompresi dan metadata dihapus. Kamu bisa mencoba 3 analisis per hari tanpa akun; masuk untuk menyimpan lintas perangkat.</p>{analysisError && <div className="error-message" role="alert">{analysisError} <button onClick={() => { setEditor("manual"); setSearchOpen(true); }}>Cari manual</button></div>}{analysis && <PhotoReview analysis={analysis} draft={draft} corrections={corrections} savedMeals={savedMeals} selections={analysisSelections} aliases={analysisAliases} unmatched={unmatchedCandidates} ignored={ignoredCandidates} confirmed={analysisConfirmed} answer={answer} photoFile={photoFile} analyzing={analyzing} onSelect={selectCandidate} onAlias={(index, alias) => { setAnalysisAliases((current) => ({ ...current, [index]: alias })); setAnalysisConfirmed(false); }} onCorrection={applyPersonalCorrection} onSaved={applyPersonalSaved} onIgnore={ignoreCandidate} onSearch={() => { setSearchOpen(true); setQuery(""); }} onAnswer={setAnswer} onReanalyze={(file) => void analyzePhoto(file)} onConfirm={setAnalysisConfirmed} />}</div>}
      {editor === "tersimpan" && <SavedMealLibrary savedMeals={savedMeals} recentMeals={recentMeals} recentFoods={recentFoods} frequentFoods={frequentFoods} deletingId={deletingSavedId} onCreate={() => { openEditor("manual"); setSavedFormOpen(true); setSavedCategory(mealType); }} onUseSaved={useSavedMeal} onEditSaved={editSavedCombination} onDeleteSaved={(saved) => void removeSavedCombination(saved)} onUseRecentMeal={(meal) => { openEditor("manual", meal.items, meal.title); setMealType(meal.type); }} onUseFood={addShortcutFood} />}
      {(editor === "manual" || editor === "foto") && <><div className="editor-fields"><Field label="Jenis makan"><select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>{mealTypes.map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Tanggal"><input type="date" value={mealDate} onChange={(event) => setMealDate(event.target.value)} required /></Field><Field label="Jam"><input type="time" value={mealTime} onChange={(event) => setMealTime(event.target.value)} required /></Field><Field label="Nama catatan (opsional)"><input value={mealTitle} onChange={(event) => setMealTitle(event.target.value)} placeholder="Contoh: Makan siang di warteg" /></Field></div><div className="draft-heading"><div><h3>Periksa makanan & porsi</h3><p>Semua angka di bawah adalah perkiraan dari data per 100 g.</p></div></div>{draft.length ? <div className="draft-list">{draft.map((item) => <div className="draft-item" key={item.id}><div className="draft-item-top"><div className="food-badge">{item.foodId === "nasi" ? "🍚" : item.foodId?.includes("ayam") ? "🍗" : item.foodId === "sayur" ? "🥬" : "🍽️"}</div><div className="draft-item-name"><label htmlFor={`name-${item.id}`}>Nama makanan</label><input id={`name-${item.id}`} value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} /><small>{item.source}</small></div><button onClick={() => removeDraftItem(item.id)} aria-label={`Hapus ${item.name}`} className="icon-button"><X size={18} /></button></div><div className="portion-row"><Field label="Jumlah"><input type="number" min="0.1" step="0.1" value={item.quantity} onChange={(event) => { const quantity = Number(event.target.value); updateItem(item.id, { quantity, grams: quantity * item.gramsPerUnit }); }} /></Field><Field label="Satuan"><select value={item.unit} onChange={(event) => { setDraft((current) => current.map((entry) => entry.id === item.id ? changeServing(entry, event.target.value) : entry)); setAnalysisConfirmed(false); }}>{foods.find((record) => record.id === item.foodId)?.servings.map((serving) => <option key={serving.unit}>{serving.unit}</option>)}<option value="gram">gram</option></select></Field><div className="portion-grams">≈ {number(item.grams)} g</div></div><div className="item-nutrition"><strong>{number(nutrientsFor(item).calories)} kkal</strong><span>P {number(nutrientsFor(item).protein)} · K {number(nutrientsFor(item).carbs)} · L {number(nutrientsFor(item).fat)} g</span></div></div>)}</div> : <div className="empty-draft"><UtensilsCrossed size={24} /><span>Belum ada makanan. Cari di katalog contoh atau buat entri sendiri.</span></div>}
      <button className="add-food-button" onClick={() => { setSearchOpen(!searchOpen); setCustomOpen(false); }}><Plus size={17} /> Tambah makanan</button>{searchOpen && <div className="food-search"><label className="search-input"><Search size={18} /><input autoFocus placeholder="Cari nasi, ayam, tempe..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>{!query.trim() && <FoodShortcuts recent={recentFoods} frequent={frequentFoods} onAdd={addShortcutFood} />}<div className="food-results">{filteredFoods.map((food) => <button key={food.id} onClick={() => addFood(food)}><span><strong>{food.name}</strong><small>{food.category} · {food.source}</small></span><span>{number(food.per100g.calories)} kkal / 100 g <Plus size={16} /></span></button>)}{!filteredFoods.length && <p className="empty-inline">Tidak ada yang cocok. Kamu bisa membuat entri sendiri dari label gizi.</p>}</div><button className="text-button" onClick={() => { setCustomOpen(true); setSearchOpen(false); }}><Plus size={16} /> Buat makanan sendiri</button></div>}{customOpen && <div className="custom-form"><h4>Makanan sendiri</h4><p>Isi nilai dari label atau sumber yang kamu percaya, per 100 gram.</p><Field label="Nama makanan"><input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Contoh: Sup buatan rumah" /></Field><div className="custom-grid"><Field label="Kalori"><input type="number" min="0" value={customCalories} onChange={(event) => setCustomCalories(event.target.value)} /></Field><Field label="Protein (g)"><input type="number" min="0" value={customProtein} onChange={(event) => setCustomProtein(event.target.value)} /></Field><Field label="Karbo (g)"><input type="number" min="0" value={customCarbs} onChange={(event) => setCustomCarbs(event.target.value)} /></Field><Field label="Lemak (g)"><input type="number" min="0" value={customFat} onChange={(event) => setCustomFat(event.target.value)} /></Field></div><button className="primary-button" onClick={addCustom}>Tambahkan</button></div>}</>}
      {savedFormOpen && (editor === "manual" || editor === "foto") && <SavedMealForm editing={Boolean(savedEditingId)} title={savedTitle} note={savedNote} category={savedCategory} items={draft} busy={savingSaved} onTitle={setSavedTitle} onNote={setSavedNote} onCategory={setSavedCategory} onSave={() => void saveCombination()} onCancel={() => { const original = savedMeals.find((entry) => entry.id === savedEditingId); if (original) setDraft(cloneItems(original.items)); setSavedFormOpen(false); setSavedEditingId(null); }} />}
      </div><div className="editor-footer"><div className="draft-total"><small>TOTAL PERKIRAAN</small><strong>{number(total(draft).calories)} <span>kkal</span></strong><span className="draft-macros">Protein {number(total(draft).protein)} g / Karbo {number(total(draft).carbs)} g / Lemak {number(total(draft).fat)} g</span></div><div className="footer-buttons"><button className="outline-button save-combo" onClick={() => { if (!savedFormOpen) startSavedCombination(); }} disabled={editor === "tersimpan" || !draft.length || savedFormOpen || savingSaved || analysisNeedsReview}><Bookmark size={17} /> {savedFormOpen ? "Detail terbuka" : "Simpan kombinasi"}</button><button className="primary-button" onClick={saveMeal} disabled={editor === "tersimpan" || !draft.length || saving || savedFormOpen || storageMode === "loading" || storageMode === "error" || analysisNeedsReview}><Check size={18} /> {saving ? "Menyimpan..." : "Simpan catatan"}</button></div></div></section></div>}
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
