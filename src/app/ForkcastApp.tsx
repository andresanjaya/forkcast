"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { deleteAllAccountData, deleteMeal as deleteRemoteMeal, deleteSavedMeal as deleteRemoteSavedMeal, deleteWeight as deleteRemoteWeight, importDemoMeal, importDemoSavedMeal, importDemoWeights, insertFoodCorrections, insertMeal as insertRemoteMeal, insertSavedMeal, loadAccountData, saveCalorieTarget, saveProfileWithWeight, saveUserProduct, updateSavedMeal } from "@/lib/supabase/data";
import ProfileView from "./ProfileView";
import SavedMealLibrary from "./SavedMealLibrary";
import SavedMealForm from "./SavedMealForm";
import FoodShortcuts from "./FoodShortcuts";
import FoodLibrary from "./FoodLibrary";
import PhotoReview, { type Analysis } from "./PhotoReview";
import PhotoSources from "./PhotoSources";
import WeeklyProgress from "./WeeklyProgress";
import HomeDashboard from "@/components/forkcast/HomeDashboard";
import LogFoodLanding from "@/components/forkcast/LogFoodLanding";
import MealDetail from "@/components/forkcast/MealDetail";
import Welcome from "@/components/forkcast/Welcome";
import AddFoodActions from "@/components/forkcast/AddFoodActions";
import ScanResultDetail from "@/components/forkcast/ScanResultDetail";
import CameraCapture, { type CameraMode } from "./CameraCapture";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyMealItems, correctionsFromReview, frequentFoodShortcuts, recentFoodShortcuts, savedMealError, type FoodCorrection } from "@/lib/meal-memory";
import { photoReviewState } from "@/lib/photo-review";
import type { PackagedProduct, UserProduct } from "@/lib/packaged-food";
import { addCalendarDays, mondayOf, summarizeWeek, todayInTimeZone } from "@/lib/weekly-progress";
import { activeTarget, addTargetRecord, profileError, putWeightRecord, validTarget, type TargetRecord } from "@/lib/target";
import { ArrowLeft, ArrowRight, Barcode, Bookmark, Camera, Check, ClipboardList, Home, Leaf, MoreHorizontal, Plus, Search, Sparkles, Trash2, TrendingUp, UserRound, UtensilsCrossed, WifiOff, X } from "lucide-react";
import { allFoods, changeServing, defaultProfile, editMealItem, foods, itemAmountLabel, itemFromFood, matchCandidateFood, mealTypes, nutrientsFor, total, type Food, type Meal, type MealItem, type MealType, type Profile, type SavedMeal, type WeightEntry } from "@/lib/food";

type Tab = "beranda" | "riwayat" | "progres" | "profil";
type EditorMode = "log" | "manual" | "foto" | "tersimpan" | "katalog" | "barcode";
const STORAGE = "porsi-demo-v1";
const PHOTO_CACHE = "forkcast-meal-photo-previews-v1";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", options ?? { weekday: "long", day: "numeric", month: "long" });
const number = (value: number | null) => value === null ? "â€”" : Math.round(value).toLocaleString("id-ID");
const cloneItems = copyMealItems;
const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), { ssr: false, loading: () => <p className="microcopy" role="status">Menyiapkan pemindai barcodeâ€¦</p> });

function readMealPhotoCache(): Record<string, string> {
  try {
    const stored = JSON.parse(localStorage.getItem(PHOTO_CACHE) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].startsWith("data:image/")).slice(-24));
  } catch { return {}; }
}
function writeMealPhotoCache(previews: Record<string, string>) {
  try { localStorage.setItem(PHOTO_CACHE, JSON.stringify(Object.fromEntries(Object.entries(previews).slice(-24)))); } catch { }
}
async function createMealPhotoPreview(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Pratinjau foto tidak dapat dibuat."); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Pratinjau foto tidak dapat dibuat.")), "image/jpeg", .68));
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Pratinjau foto tidak dapat dibaca."));
    reader.readAsDataURL(blob);
  });
}
export default function HomePage({ startInEditor = false }: { startInEditor?: boolean }) {
  const [ready, setReady] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [viewMeal, setViewMeal] = useState<Meal | null>(null);
  const [viewScanDetail, setViewScanDetail] = useState(false);
  const [homeScanActive, setHomeScanActive] = useState(false);
  const [addActionsOpen, setAddActionsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"home" | "editor">("home");
  const [cameraInitialMode, setCameraInitialMode] = useState<CameraMode>("food");
  const [initialBarcode, setInitialBarcode] = useState<string | null>(null);
  const galleryPickerRef = useRef<HTMLInputElement>(null);
  const [profileInitialSection, setProfileInitialSection] = useState<"overview" | "account">("overview");
  const [tab, setTab] = useState<Tab>("beranda");
  const profileDirtyRef = useRef(false);
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayInTimeZone()));
  const [date, setDate] = useState(today);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealPhotoPreviews, setMealPhotoPreviews] = useState<Record<string, string>>({});
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [corrections, setCorrections] = useState<FoodCorrection[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [targets, setTargets] = useState<TargetRecord[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [canImport, setCanImport] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [editor, setEditor] = useState<EditorMode | null>(startInEditor ? "log" : null);
  const [mealType, setMealType] = useState<MealType>("Makan siang");
  const [mealDate, setMealDate] = useState(today);
  const [mealTime, setMealTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [draft, setDraft] = useState<MealItem[]>([]);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [pendingProducts, setPendingProducts] = useState<PackagedProduct[]>([]);
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
  const [libraryQuery, setLibraryQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(startInEditor);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisConfirmed, setAnalysisConfirmed] = useState(false);
  const [ignoredCandidates, setIgnoredCandidates] = useState<number[]>([]);
  const [removedScanCandidates, setRemovedScanCandidates] = useState<number[]>([]);
  const [analysisSelections, setAnalysisSelections] = useState<Record<number, string>>({});
  const [candidateExtras, setCandidateExtras] = useState<Record<number, string[]>>({});
  const [analysisInitialFoodIds, setAnalysisInitialFoodIds] = useState<Record<number, string | null>>({});
  const [analysisAliases, setAnalysisAliases] = useState<Record<number, string>>({});
  const [analysisError, setAnalysisError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryPreview, setGalleryPreview] = useState("");
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
      const cachedPhotos = readMealPhotoCache();
      setMealPhotoPreviews(cachedPhotos);
      setWelcome(!saved && !localStorage.getItem("forkcast-welcome-seen"));
      if (saved) {
        const data = JSON.parse(saved);
        setProfile(data.profile ?? defaultProfile);
        setMeals(Array.isArray(data.meals) ? data.meals.map((meal: Meal) => ({ ...meal, photoPreview: cachedPhotos[meal.id] ?? meal.photoPreview })) : []);
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
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); window.removeEventListener("beforeinstallprompt", onInstall); };
  }, []);
  useEffect(() => { if (ready && storageMode === "local") localStorage.setItem(STORAGE, JSON.stringify({ profile, meals: meals.map(({ photoPreview, ...meal }) => meal), savedMeals, corrections, weights, targets })); }, [ready, storageMode, profile, meals, savedMeals, corrections, weights, targets]);
  useEffect(() => { if (savedFormOpen) requestAnimationFrame(() => document.querySelector(".saved-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" })); }, [savedFormOpen, editor]);
  useEffect(() => { if (!message) return; const timeout = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(timeout); }, [message]);
  useEffect(() => {
    if (!photoFile) { setGalleryPreview(""); return; }
    const preview = URL.createObjectURL(photoFile);
    setGalleryPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photoFile]);
  useEffect(() => { if (!editor) setGalleryFile(null); }, [editor]);
  useEffect(() => {
    const onPopState = () => setEditor(window.location.pathname === "/catat" ? "log" : null);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) { setAuthChecked(true); return; }
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      setAuthChecked(true);
      if (event === "PASSWORD_RECOVERY") { setRecoveryMode(true); setTab("profil"); }
      if (session?.user) {
        setAccountId(session.user.id); setAccountEmail(session.user.email ?? ""); setStorageMode("loading");
      } else if (event === "SIGNED_OUT") {
        setAccountId(null); setAccountEmail(""); setStorageMode("loading");
        setUserProducts([]); setPendingProducts([]);
        try {
          const local = JSON.parse(localStorage.getItem(STORAGE) ?? "{}");
          const cachedPhotos = readMealPhotoCache(); setMealPhotoPreviews(cachedPhotos);
          setProfile(local.profile ?? defaultProfile); setMeals((local.meals ?? []).map((meal: Meal) => ({ ...meal, photoPreview: cachedPhotos[meal.id] ?? meal.photoPreview }))); setSavedMeals(local.savedMeals ?? []); setCorrections(local.corrections ?? []); setWeights(local.weights ?? []); setTargets(local.targets ?? []);
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
      const cachedPhotos = readMealPhotoCache(); setMealPhotoPreviews(cachedPhotos); setProfile(data.profile); setMeals(data.meals.map((meal) => ({ ...meal, photoPreview: cachedPhotos[meal.id] }))); setSavedMeals(data.savedMeals); setCorrections(data.corrections); setWeights(data.weights); setTargets(data.targets); setUserProducts(data.userProducts); setHasProfile(data.hasProfile);
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
  const target = activeTarget(targets)?.calories ?? profile.calorieTarget;
  const filteredFoods = useMemo(() => foods.filter((food) => `${food.name} ${food.aliases.join(" ")}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [query]);
  const recentMeals = useMemo(() => [...meals].sort((a, b) => (b.eatenAt ?? b.createdAt).localeCompare(a.eatenAt ?? a.createdAt)).slice(0, 5), [meals]);
  const recentFoods = useMemo(() => recentFoodShortcuts(meals), [meals]);
  const frequentFoods = useMemo(() => frequentFoodShortcuts(meals), [meals]);
  const photoReview = analysis ? photoReviewState(analysis.items.length, analysisSelections, ignoredCandidates, draft, candidateExtras) : null;
  const effectiveDraft = photoReview?.included ?? draft;
  const editableDraft = photoReview ? draft.filter((item) => effectiveDraft.some((entry) => entry.id === item.id) || photoReview.invalid.some((entry) => entry.id === item.id)) : draft;
  const analysisNeedsReview = Boolean(analysis && (!analysisConfirmed || photoReview!.unresolved.length > 0 || photoReview!.invalid.length > 0 || effectiveDraft.length === 0));
  const weeklySummary = useMemo(() => summarizeWeek(weekStart, meals, targets, weights, todayInTimeZone()), [weekStart, meals, targets, weights]);

  function openEditor(mode: EditorMode, items: MealItem[] = [], title = "", entryDate = date) {
    if (window.location.pathname !== "/catat") window.history.pushState({ forkcastEditor: true }, "", "/catat");
    setPendingProducts([]);
    setEditor(mode); setDraft(cloneItems(items)); setMealTitle(title); setMealDate(entryDate); setMealTime(new Date().toTimeString().slice(0, 5)); setQuery(""); setAnalysis(null); setAnalysisConfirmed(false); setIgnoredCandidates([]); setRemovedScanCandidates([]); setAnalysisSelections({}); setCandidateExtras({}); setAnalysisInitialFoodIds({}); setAnalysisAliases({}); setAnalysisError(""); setPhotoName(""); setPhotoFile(null); setGalleryFile(null); setAnswer(""); setSearchOpen(mode === "manual" && items.length === 0); setCustomOpen(false); setEntryFromSaved(false); setSavedFormOpen(false); setSavedEditingId(null); setSavedTitle(""); setSavedNote(""); setSavedCategory(null);
  }
  function closeEditor() {
    setEditor(null);
    if (window.location.pathname !== "/catat") return;
    if (window.history.state?.forkcastEditor) window.history.back();
    else window.history.replaceState({}, "", "/");
  }
  function addFood(food: Food) { setDraft((current) => [...current, itemFromFood(food)]); setAnalysisConfirmed(false); setSearchOpen(false); setQuery(""); }
  function addLibraryFood(item: MealItem) {
    setDraft((current) => analysis ? [item] : [...current, item]);
    setAnalysis(null); setAnalysisConfirmed(false); setIgnoredCandidates([]); setCandidateExtras({});
    setSearchOpen(false); setEditor("manual");
    setMessage(`${item.name} ditambahkan. Periksa porsi dan waktu sebelum menyimpan.`);
  }
  function addBarcodeFood(item: MealItem, product: PackagedProduct, remember: boolean) {
    setDraft((current) => [...current, item]);
    if (remember && accountId && storageMode === "account") setPendingProducts((current) => [...current.filter((entry) => entry.barcode !== product.barcode || !entry.barcode), product]);
    setEditor("manual"); setSearchOpen(false); setAnalysis(null); setAnalysisConfirmed(false);
    setMessage(`${item.name} ditambahkan. Periksa jumlah, tanggal, dan waktu sebelum menyimpan.`);
  }
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
    setSavedTitle(mealTitle.trim() || effectiveDraft.map((item) => item.name).slice(0, 2).join(" & "));
    setSavedNote(""); setSavedCategory(mealType);
  }
  function updateItem(id: string, patch: Partial<MealItem>) { setDraft((current) => editMealItem(current, id, patch)); setAnalysisConfirmed(false); }
  function removeDraftItem(id: string) {
    setDraft((current) => current.filter((item) => item.id !== id)); setAnalysisConfirmed(false);
    if (analysis) {
      const affected = Object.entries(analysisSelections).filter(([, selectedId]) => selectedId === id).map(([index]) => Number(index));
      if (affected.length) {
        setAnalysisSelections((current) => Object.fromEntries(Object.entries(current).filter(([index]) => !affected.includes(Number(index)))));
        setCandidateExtras((current) => Object.fromEntries(Object.entries(current).filter(([index]) => !affected.includes(Number(index)))));
      }
      setCandidateExtras((current) => Object.fromEntries(Object.entries(current).map(([index, ids]) => [index, ids.filter((itemId) => itemId !== id)])));
    }
  }
  function selectCandidate(index: number, itemId: string) {
    setAnalysisSelections((current) => { const next = { ...current }; if (itemId) next[index] = itemId; else delete next[index]; return next; });
    setIgnoredCandidates((current) => current.filter((value) => value !== index));
    setAnalysisConfirmed(false);
  }
  function toggleCandidate(index: number, included: boolean) {
    setIgnoredCandidates((current) => included ? current.filter((value) => value !== index) : [...new Set([...current, index])]);
    setAnalysisConfirmed(false);
  }
  function deleteScanCandidate(index: number) {
    setRemovedScanCandidates((current) => current.includes(index) ? current : [...current, index]);
    setIgnoredCandidates((current) => current.includes(index) ? current : [...current, index]);
    setAnalysisConfirmed(false);
  }
  function addPhotoFood(index: number | null, item: MealItem) {
    if (index === null) { setDraft((current) => [...current, item]); setAnalysisConfirmed(false); return; }
    const previousIds = [analysisSelections[index], ...(candidateExtras[index] ?? [])].filter(Boolean);
    setDraft((current) => [...current.filter((entry) => !previousIds.includes(entry.id)), item]);
    setCandidateExtras((current) => { const next = { ...current }; delete next[index]; return next; });
    selectCandidate(index, item.id);
  }
  function updateCandidatePortion(index: number, grams: number) {
    const id = analysisSelections[index];
    if (id) updateItem(id, { unit: "gram", gramsPerUnit: 1, quantity: grams, grams });
  }
  function applyPersonalCorrection(index: number, correction: FoodCorrection) {
    const item = cloneItems([correction.item])[0];
    item.corrected = true;
    addPhotoFood(index, item);
    setAnalysisAliases((current) => ({ ...current, [index]: correction.alias }));
  }
  function applyPersonalSaved(index: number, saved: SavedMeal) {
    const items = cloneItems(saved.items);
    if (!items.length) return;
    const previousIds = [analysisSelections[index], ...(candidateExtras[index] ?? [])].filter(Boolean);
    setDraft((current) => [...current.filter((entry) => !previousIds.includes(entry.id)), ...items]);
    setCandidateExtras((current) => ({ ...current, [index]: items.slice(1).map((item) => item.id) }));
    selectCandidate(index, items[0].id);
  }
  async function saveMeal() {
    if (!effectiveDraft.length) { setMessage("Tambahkan setidaknya satu makanan yang dihitung."); return; }
    if (analysisNeedsReview) { setMessage("Periksa semua kandidat foto dan konfirmasi sebelum menyimpan."); return; }
    if (effectiveDraft.some((item) => !item.name.trim() || item.grams <= 0 || !Number.isFinite(item.grams) || item.packaged && (!Number.isFinite(item.packaged.basis.amount) || item.packaged.basis.amount <= 0))) { setMessage("Periksa nama dan porsi makanan."); return; }
    const eatenAt = new Date(`${mealDate}T${mealTime}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate) || !/^\d{2}:\d{2}$/.test(mealTime) || Number.isNaN(eatenAt.getTime())) { setMessage("Periksa tanggal dan waktu makan."); return; }
    const title = mealTitle.trim() || effectiveDraft.map((item) => item.name).slice(0, 2).join(" & ");
    const isPhotoScan = Boolean(analysis);
    const photoPreview = photoFile ? await createMealPhotoPreview(photoFile).catch(() => undefined) : undefined;
    const meal: Meal = { id: crypto.randomUUID(), date: mealDate, eatenAt: eatenAt.toISOString(), type: mealType, title, method: isPhotoScan || editor === "foto" ? "foto" : entryFromSaved ? "tersimpan" : "manual", items: cloneItems(effectiveDraft), createdAt: new Date().toISOString(), ...(photoPreview ? { photoPreview } : {}) };
    const newCorrections = analysis ? correctionsFromReview(analysis.items, analysisSelections, analysisInitialFoodIds, analysisAliases, effectiveDraft, meal.createdAt) : [];
    let correctionFailed = false;
    let productFailed = false;
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
        for (const product of pendingProducts) {
          try { await saveUserProduct(client, accountId, product); }
          catch { productFailed = true; }
        }
      }
      catch { setMessage("Makanan belum tersimpan ke akun. Periksa koneksi dan coba lagi."); setSaving(false); return; }
      setSaving(false);
    }
    if (newCorrections.length && !correctionFailed) setCorrections((current) => [...newCorrections, ...current].slice(0, 200));
    if (pendingProducts.length && !productFailed) setUserProducts((current) => [...pendingProducts.map((product) => ({ id: crypto.randomUUID(), product, updatedAt: new Date().toISOString() })), ...current.filter((entry) => !pendingProducts.some((product) => product.barcode && product.barcode === entry.product.barcode))]);
    setPendingProducts([]);
    setMeals((current) => [meal, ...current]); setDate(mealDate);
    if (photoPreview) { const nextPhotos = { ...mealPhotoPreviews, [meal.id]: photoPreview }; writeMealPhotoCache(nextPhotos); setMealPhotoPreviews(nextPhotos); }
    if (homeScanActive) { setViewScanDetail(false); setHomeScanActive(false); setAnalysis(null); setPhotoFile(null); setDraft([]); setTab("beranda"); }
    else { closeEditor(); setTab("beranda"); }
    setMessage(productFailed ? "Catatan tersimpan, tetapi produk pribadi belum tersimpan. Periksa koneksi." : correctionFailed ? "Makanan tersimpan, tetapi koreksi belum dapat diingat. Periksa koneksi." : "Makanan tersimpan. Kamu bisa mengubahnya kapan saja.");
  }
  async function saveCombination() {
    const error = savedMealError(savedTitle, savedNote, effectiveDraft);
    if (error) { setMessage(error); return; }
    if (analysisNeedsReview) { setMessage("Periksa dan konfirmasi kandidat foto sebelum menyimpan kombinasi."); return; }
    const previous = savedEditingId ? savedMeals.find((entry) => entry.id === savedEditingId) : undefined;
    if (savedEditingId && !previous) { setMessage("Kombinasi tidak ditemukan. Buka lagi dari daftar tersimpan."); return; }
    const now = new Date().toISOString();
    const saved: SavedMeal = { id: previous?.id ?? crypto.randomUUID(), title: savedTitle.trim(), note: savedNote.trim(), category: savedCategory, items: cloneItems(effectiveDraft), createdAt: previous?.createdAt ?? now, updatedAt: now };
    const newCorrections = analysis ? correctionsFromReview(analysis.items, analysisSelections, analysisInitialFoodIds, analysisAliases, effectiveDraft, now) : [];
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
    openEditor("manual", meal.items, meal.title, meal.date);
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
    setMeals((current) => current.filter((meal) => meal.id !== id));
    setMealPhotoPreviews((current) => { const next = { ...current }; delete next[id]; writeMealPhotoCache(next); return next; }); setMessage("Catatan dihapus.");
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
    const cachedMealPhotos = readMealPhotoCache();
    const importedMealPhotos = { ...cachedMealPhotos };
    for (const meal of (Array.isArray(local.meals) ? local.meals : []) as Meal[]) {
      const id = importId("meal", meal.id);
      const preview = meal.photoPreview ?? cachedMealPhotos[meal.id];
      if (preview) importedMealPhotos[id] = preview;
      await importDemoMeal(client, accountId, { ...meal, id, items: meal.items.map((item) => ({ ...item, id: importId("item", item.id) })) });
    }
    writeMealPhotoCache(importedMealPhotos);
    for (const saved of (Array.isArray(local.savedMeals) ? local.savedMeals : []) as SavedMeal[]) await importDemoSavedMeal(client, accountId, { ...saved, id: importId("saved", saved.id) });
    const localCorrections = (Array.isArray(local.corrections) ? local.corrections : []) as FoodCorrection[];
    if (localCorrections.length) await insertFoodCorrections(client, accountId, localCorrections.map((entry) => ({ ...entry, id: importId("correction", entry.id) })));
    await importDemoWeights(client, accountId, ((Array.isArray(local.weights) ? local.weights : []) as WeightEntry[]).map((entry) => ({ ...entry, id: importId("weight", entry.id) })));
    const data = await loadAccountData(client, accountId);
    const cachedPhotos = readMealPhotoCache(); setMealPhotoPreviews(cachedPhotos); setProfile(data.profile); setMeals(data.meals.map((meal) => ({ ...meal, photoPreview: cachedPhotos[meal.id] }))); setSavedMeals(data.savedMeals); setCorrections(data.corrections); setWeights(data.weights); setTargets(data.targets); setHasProfile(true); setCanImport(false);
    localStorage.setItem(`porsi-imported-${accountId}`, "true");
    localStorage.removeItem(`porsi-import-pending-${accountId}`);
  }
  async function removeAllData() {
    if (!confirm(accountId ? "Hapus semua catatan akun dan profil? Akun masuk tetap ada." : "Hapus semua catatan, profil, dan berat dari perangkat ini?")) return;
    if (accountId) {
      const client = getSupabaseBrowser(); if (!client || storageMode !== "account") return;
      try { await deleteAllAccountData(client, accountId); } catch { setMessage("Sebagian data akun belum terhapus. Periksa koneksi dan coba lagi."); return; }
      localStorage.removeItem(PHOTO_CACHE); setMealPhotoPreviews({});
      await client.auth.signOut();
      setMessage("Data akun dihapus. Kamu telah keluar dari akun.");
      return;
    }
    localStorage.removeItem(STORAGE); localStorage.removeItem(PHOTO_CACHE); setMealPhotoPreviews({});
    setMeals([]); setSavedMeals([]); setCorrections([]); setWeights([]); setTargets([]); setProfile(defaultProfile); setMessage("Data catatan telah dihapus.");
  }
  function addCustom() {
    const calories = Number(customCalories), protein = Number(customProtein), carbs = Number(customCarbs), fat = Number(customFat);
    if (!customName.trim() || [calories, protein, carbs, fat].some((value) => !Number.isFinite(value) || value < 0)) { setMessage("Isi nama dan nilai gizi per 100 g dengan angka yang valid."); return; }
    setDraft((current) => [...current, { id: crypto.randomUUID(), foodId: null, name: customName.trim(), quantity: 100, unit: "gram", gramsPerUnit: 1, grams: 100, per100g: { calories, protein, carbs, fat }, source: "Diisi pengguna", corrected: true }]);
    setAnalysisConfirmed(false); setCustomOpen(false); setSearchOpen(false); setCustomName(""); setCustomCalories(""); setCustomProtein(""); setCustomCarbs(""); setCustomFat("");
  }
  function chooseGalleryPhoto(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setAnalysisError("Format belum didukung. Pilih JPEG, PNG, atau WebP dari galeri."); return; }
    if (file.size === 0 || file.size > 8 * 1024 * 1024) { setAnalysisError("Foto harus berukuran di bawah 8 MB."); return; }
    setGalleryFile(file); setPhotoFile(file); setPhotoName(file.name); setAnalysisError(""); setAnalysis(null); setAnalysisConfirmed(false); setIgnoredCandidates([]); setRemovedScanCandidates([]); setAnalysisSelections({}); setCandidateExtras({}); setAnalysisInitialFoodIds({}); setAnalysisAliases({}); setDraft([]); setAnswer("");
  }
  function cancelGalleryPhoto() {
    setGalleryFile(null); setPhotoFile(null); setPhotoName(""); setAnalysisError(""); setAnalysis(null); setAnalysisConfirmed(false); setIgnoredCandidates([]); setRemovedScanCandidates([]); setAnalysisSelections({}); setCandidateExtras({}); setAnalysisInitialFoodIds({}); setAnalysisAliases({}); setDraft([]); setAnswer("");
  }
  function openCamera(target: "home" | "editor", mode: CameraMode = "food") {
    setCameraTarget(target);
    setCameraInitialMode(mode);
    setAddActionsOpen(false);
    setCameraOpen(true);
  }
  function startHomePhoto(file: File, context = "") {
    setAddActionsOpen(false);
    setTab("beranda");
    setViewMeal(null);
    setViewScanDetail(false);
    setHomeScanActive(true);
    void analyzePhoto(file, context);
  }
  function handleCameraCapture(file: File, mode: CameraMode) {
    setCameraOpen(false);
    const context = mode === "label" ? "Ini foto label gizi kemasan. Baca nama produk dan nilai gizi yang terlihat; gunakan ukuran sajian pada label untuk memperkirakan nilai per 100 g jika informasinya cukup. Tandai nilai yang sulit dibaca sebagai perkiraan." : "";
    if (cameraTarget === "home") startHomePhoto(file, context);
    else { setEditor("foto"); chooseGalleryPhoto(file); void analyzePhoto(file, context); }
  }
  function handleCameraBarcode(code: string) {
    setCameraOpen(false);
    setInitialBarcode(code);
    openEditor("barcode");
  }
  function handleCameraGallery(file: File) {
    setCameraOpen(false);
    if (cameraTarget === "home") startHomePhoto(file);
    else { setEditor("foto"); chooseGalleryPhoto(file); void analyzePhoto(file); }
  }
  async function analyzePhoto(file: File | undefined, context = answer) {
    if (!file) return;
    setPhotoName(file.name); setPhotoFile(file); setAnalysisError(""); setAnalysis(null); setAnalysisConfirmed(false); setIgnoredCandidates([]); setRemovedScanCandidates([]); setAnalysisSelections({}); setCandidateExtras({}); setAnalysisInitialFoodIds({}); setAnalysisAliases({}); setDraft([]);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setAnalysisError("Gunakan foto JPEG, PNG, atau WebP."); return; }
    if (file.size > 8 * 1024 * 1024) { setAnalysisError("Foto terlalu besar. Pilih foto di bawah 8 MB."); return; }
    if (!online) { setAnalysisError("Sedang offline. Kamu tetap bisa menambahkan makanan secara manual."); return; }
    setAnalyzing(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > 4_000_000) throw new Error("Foto masih terlalu besar setelah dikompresi. Pilih foto lain.");
      const form = new FormData(); form.append("image", compressed); if (context.trim()) form.append("context", context.trim());
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
    } catch (error) { setAnalysisError(error instanceof Error ? error.message : "Analisis gagal. Coba lagi atau catat manual."); }
    finally { setAnalyzing(false); }
  }
  function openTab(next: Tab) {
    if (tab === "profil" && next !== "profil" && profileDirtyRef.current && !window.confirm("Ada perubahan profil atau target yang belum disimpan. Buang perubahan dan pindah halaman?")) return;
    if (next !== "profil") profileDirtyRef.current = false;
    if (next === "profil") setProfileInitialSection("overview");
    setTab(next);
  }

  function finishWelcome(login: boolean) {
    localStorage.setItem("forkcast-welcome-seen", "true"); setWelcome(false);
    if (login) { setProfileInitialSection("account"); setTab("profil"); }
  }
  const scanReviewProps = analysis ? {
    analysis, draft, corrections, savedMeals, selections: analysisSelections, extras: candidateExtras, aliases: analysisAliases,
    ignored: ignoredCandidates, removedCandidates: removedScanCandidates, confirmed: analysisConfirmed, answer, photoFile, analyzing,
    onFood: addPhotoFood, onToggle: toggleCandidate, onDeleteCandidate: deleteScanCandidate, onPortion: updateCandidatePortion,
    onAlias: (index: number, alias: string) => { setAnalysisAliases((current) => ({ ...current, [index]: alias })); setAnalysisConfirmed(false); },
    onCorrection: applyPersonalCorrection, onSaved: applyPersonalSaved, onAnswer: setAnswer,
    onReanalyze: (file: File) => void analyzePhoto(file), onConfirm: setAnalysisConfirmed,
  } : null;
  if (ready && authChecked && welcome && !accountId && !editor && !recoveryMode) return <Welcome onStart={() => finishWelcome(false)} onLogin={() => finishWelcome(true)} />;
  if (viewScanDetail && analysis && scanReviewProps) return <ScanResultDetail preview={galleryPreview} title={mealTitle.trim() || analysis.items.slice(0, 2).map((item) => item.candidateName).join(" & ")} mealType={mealType} eatenAt={`${mealDate} Â· ${mealTime}`} calories={total(effectiveDraft).calories} protein={total(effectiveDraft).protein} carbs={total(effectiveDraft).carbs} fat={total(effectiveDraft).fat} review={scanReviewProps} saveDisabled={!effectiveDraft.length || saving || storageMode === "loading" || storageMode === "error" || analysisNeedsReview} saving={saving} onBack={() => setViewScanDetail(false)} onSave={() => void saveMeal()} />;
  if (viewMeal && !editor) return <MealDetail meal={viewMeal} preview={mealPhotoPreviews[viewMeal.id]} onBack={() => setViewMeal(null)} onRepeat={() => { const meal = viewMeal; setViewMeal(null); setMealType(meal.type); openEditor("manual", meal.items, meal.title, meal.date); }} onSaveCombination={() => { saveExistingCombination(viewMeal); setViewMeal(null); }} onDelete={async () => { await removeMeal(viewMeal.id); setViewMeal(null); }} />;
  return <div className={editor ? "entry-app" : "app-shell"}>
    {!editor && <>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Leaf size={23} strokeWidth={2.4} /></span><span>Forkcast</span></div>
      <div className="sidebar-label">MENU</div>
      <nav aria-label="Navigasi utama" className="side-nav">
        <NavButton active={tab === "beranda"} icon={<Home size={19} />} label="Beranda" onClick={() => openTab("beranda")} />
        <NavButton active={tab === "riwayat"} icon={<ClipboardList size={19} />} label="Riwayat makan" onClick={() => openTab("riwayat")} />
        <NavButton active={tab === "progres"} icon={<TrendingUp size={19} />} label="Progres" onClick={() => openTab("progres")} />
        <NavButton active={tab === "profil"} icon={<UserRound size={19} />} label="Profil & target" onClick={() => openTab("profil")} />
      </nav>
      <div className="sidebar-bottom"><div className="tip-icon"><Sparkles size={20} /></div><strong>Sedikit demi sedikit.</strong><p>Kenali pola makanmu tanpa perlu mengejar angka sempurna.</p></div>
      <div className="sidebar-footer"><span className="avatar">{profile.name ? profile.name.charAt(0).toUpperCase() : "P"}</span><span><strong>{profile.name || "Teman Forkcast"}</strong><small>{accountId ? "Akun tersinkron" : "Mode demo lokal"}</small></span><MoreHorizontal size={18} /></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><Leaf size={20} /></span><strong>Forkcast</strong></div><div className="topbar-spacer" /><span className="demo-pill"><span className="pill-dot" /> {accountId ? "AKUN AKTIF" : "MODE DEMO"}</span><button className="avatar top-avatar" onClick={() => openTab("profil")} aria-label="Buka profil">{profile.name ? profile.name.charAt(0).toUpperCase() : "P"}</button></header>
      {!online && <div className="offline-banner"><WifiOff size={17} /> Kamu sedang offline. Catatan lokal tetap bisa digunakan; analisis foto menunggu koneksi.</div>}
      {storageMode === "loading" && <div className="offline-banner" role="status">Memuat catatan akunmu...</div>}
      {storageMode === "error" && <div className="offline-banner" role="alert">Catatan akun belum dapat dimuat. <button className="text-button" onClick={() => setStorageMode("loading")}>Coba lagi</button></div>}
      <div className="content">
        {tab === "beranda" && <HomeDashboard date={date} today={today()} profile={profile} target={target} meals={dayMeals} account={Boolean(accountId)} scan={homeScanActive ? { status: analysis ? "ready" : analysisError ? "error" : "processing", preview: galleryPreview, fileName: photoName, itemCount: analysis?.items.length ?? 0, onOpen: () => setViewScanDetail(true), onRetry: () => { if (photoFile) void analyzePhoto(photoFile, ""); }, onDismiss: () => { setHomeScanActive(false); setViewScanDetail(false); setAnalysis(null); setPhotoFile(null); setDraft([]); } } : undefined} onDate={setDate} onAdd={(type) => { if (type) setMealType(type); setAddActionsOpen(true); }} onPhoto={() => setAddActionsOpen(true)} onHistory={() => openTab("riwayat")} onMeal={setViewMeal} />}
        {tab === "riwayat" && <><PageIntro eyebrow="CATATANMU" title="Riwayat makan" subtitle="Semua makanan yang kamu catat, tersusun dari yang terbaru." /><div className="history-actions"><Button onClick={() => setAddActionsOpen(true)}><Plus size={18} /> Catat makanan</Button><Button variant="outline" onClick={() => openEditor("tersimpan")}><Bookmark size={17} /> Makanan tersimpan</Button></div>{meals.length ? [...meals].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`)).map((meal) => <Card className="history-card" key={meal.id}><div className="history-date">{formatDate(meal.date)} Â· {meal.eatenAt ? new Date(meal.eatenAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""} Â· {meal.type}</div><div className="history-main"><div><h3><Button variant="link" onClick={() => setViewMeal(meal)}>{meal.title}</Button></h3><p>{meal.items.map((item) => `${item.name} ${itemAmountLabel(item)}`).join(" Â· ")}</p><small>{meal.method === "foto" ? "Ditinjau dari foto" : meal.method === "tersimpan" ? "Dari makanan tersimpan" : "Dicatat manual"} Â· Estimasi</small></div><div className="history-nutrition"><strong>{number(total(meal.items).calories)} <small>kkal</small></strong><span>P {number(total(meal.items).protein)} Â· K {number(total(meal.items).carbs)} Â· L {number(total(meal.items).fat)} g</span></div></div><div className="history-footer"><button onClick={() => { setDate(meal.date); setMealType(meal.type); openEditor("manual", meal.items, meal.title, meal.date); }}>Catat lagi <ArrowRight size={15} /></button><button onClick={() => saveExistingCombination(meal)}><Bookmark size={15} /> Simpan kombinasi</button><button className="danger-text" onClick={() => removeMeal(meal.id)}><Trash2 size={15} /> Hapus</button></div></Card>) : <EmptyState icon={<UtensilsCrossed size={27} />} title="Belum ada catatan" description="Mulai dengan mencari makanan atau menambahkan dari foto." action="Catat makanan" onAction={() => setAddActionsOpen(true)} />}</>}
        {tab === "progres" && <WeeklyProgress summary={weeklySummary} currentWeek={weekStart >= mondayOf(todayInTimeZone())} loading={!ready || storageMode === "loading"} error={storageMode === "error"} allWeights={weights} onPrevious={() => setWeekStart((current) => addCalendarDays(current, -7))} onNext={() => setWeekStart((current) => { const next = addCalendarDays(current, 7); return next <= mondayOf(todayInTimeZone()) ? next : current; })} onOpenDate={(selectedDate) => { setDate(selectedDate); setTab("beranda"); }} onRetry={() => setStorageMode("loading")} onSaveWeight={recordWeight} onRemoveWeight={removeWeight} />}
        {tab === "profil" && <ProfileView initialSection={profileInitialSection} profile={profile} targets={targets} weights={weights} accountId={accountId} accountEmail={accountEmail} storageMode={storageMode} supabaseConfigured={supabaseConfigured} hasProfile={hasProfile} canImport={canImport} recoveryMode={recoveryMode} onRecovered={() => setRecoveryMode(false)} onSaveProfile={saveProfile} onSaveTarget={saveTarget} onImport={importDemo} onRemoveAll={() => void removeAllData()} onOpenProgress={() => openTab("progres")} onDirtyChange={(value) => { profileDirtyRef.current = value; }} />}
      </div>
    </main>
    <button className="floating-add" onClick={() => setAddActionsOpen(true)} aria-label="Tambah makanan" aria-haspopup="dialog" aria-expanded={addActionsOpen}><Plus size={24} /><span>Catat makanan</span></button>
    <nav className="bottom-nav" aria-label="Navigasi bawah"><NavButton active={tab === "beranda"} icon={<Home size={21} />} label="Home" onClick={() => openTab("beranda")} /><NavButton active={tab === "progres"} icon={<TrendingUp size={21} />} label="Progress" onClick={() => openTab("progres")} /><span className="nav-space" /><NavButton active={tab === "riwayat"} icon={<ClipboardList size={21} />} label="Riwayat" onClick={() => openTab("riwayat")} /><NavButton active={tab === "profil"} icon={<UserRound size={21} />} label="Profil" onClick={() => openTab("profil")} /></nav>
    <input ref={galleryPickerRef} className="fc-file-picker" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Pilih foto dari galeri" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) startHomePhoto(file); }} />
    <AddFoodActions open={addActionsOpen} onOpenChange={setAddActionsOpen} onCamera={() => openCamera("home")} onGallery={() => galleryPickerRef.current?.click()} onDatabase={() => { setAddActionsOpen(false); openEditor("katalog"); }} onSaved={() => { setAddActionsOpen(false); openEditor("tersimpan"); }} />
    {installPrompt && <button className="install-button" onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}>Pasang Forkcast di perangkat <ArrowRight size={15} /></button>}
    </>}
    {message && <div className="toast" role="status"><Check size={17} />{message}<button onClick={() => setMessage("")} aria-label="Tutup pesan"><X size={16} /></button></div>}
    {cameraOpen && <CameraCapture initialMode={cameraInitialMode} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} onBarcode={handleCameraBarcode} onGallery={handleCameraGallery} />}
    {editor && <section className="editor editor-page" aria-label="Catat makanan"><div className="editor-head"><button className="editor-back" onClick={() => editor === "log" ? closeEditor() : setEditor("log")} aria-label="Kembali"><ArrowLeft size={22} /></button><div><span className="eyebrow">CATAT MAKANAN</span><h2>{editor === "log" ? "Log Food" : editor === "foto" ? analysis ? "Hasil scan" : "Scan makanan" : editor === "tersimpan" ? "Makanan tersimpan" : editor === "katalog" ? "Katalog makanan" : editor === "barcode" ? "Scan barcode" : "Tambah makanan"}</h2></div></div><div className="editor-scroll">{["manual", "katalog", "tersimpan"].includes(editor) && <Tabs value={editor} onValueChange={(value) => { if (value === "manual") { if (analysis) { setDraft([]); setMealTitle(""); setSearchOpen(true); setSavedFormOpen(false); setSavedEditingId(null); } setEditor("manual"); setAnalysis(null); setAnalysisConfirmed(false); setIgnoredCandidates([]); setCandidateExtras({}); } else if (value === "katalog") { setEditor("katalog"); setSavedFormOpen(false); setSavedEditingId(null); } else { setEditor("tersimpan"); setSavedFormOpen(false); setSavedEditingId(null); } }}><TabsList variant="line" aria-label="Pilih cara mencatat makanan"><TabsTrigger value="katalog">Katalog</TabsTrigger><TabsTrigger value="tersimpan">Tersimpan</TabsTrigger><TabsTrigger value="manual">Input manual</TabsTrigger></TabsList></Tabs>}
      {editor === "log" && <LogFoodLanding recent={recentFoods} onCamera={() => openCamera("editor")} onGallery={(file) => { setEditor("foto"); chooseGalleryPhoto(file); }} onMode={(mode) => { setEditor(mode === "manual" && analysis ? "foto" : mode); setCustomOpen(mode === "manual"); setSearchOpen(false); }} onAdd={(item) => { setDraft((current) => [...current, item]); setEditor(analysis ? "foto" : "manual"); setCustomOpen(false); setSearchOpen(false); setAnalysisConfirmed(false); }} />}
      <div hidden={editor !== "katalog"}><FoodLibrary query={libraryQuery} onQuery={setLibraryQuery} mealType={mealType} onMealType={setMealType} onAdd={addLibraryFood} /></div>
      {editor === "barcode" && <BarcodeScanner key={accountId ?? "guest"} initialCode={initialBarcode} onInitialCodeConsumed={() => setInitialBarcode(null)} onOpenCamera={() => openCamera("editor", "barcode")} mealType={mealType} onMealType={setMealType} recent={recentFoods} saved={userProducts} signedIn={Boolean(accountId && storageMode === "account")} onAdd={addBarcodeFood} />}
      {editor === "foto" && <div className="photo-panel"><PhotoSources analyzing={analyzing} galleryFile={galleryFile} galleryPreview={galleryPreview} photoName={photoName} analysisReady={Boolean(analysis)} onCamera={() => openCamera("editor")} onGallery={chooseGalleryPhoto} onAnalyze={() => void analyzePhoto(galleryFile ?? undefined)} onCancel={cancelGalleryPhoto} onPreviewError={() => setAnalysisError("Pratinjau foto tidak dapat ditampilkan. Pilih foto lain.")} /><p className="microcopy">Foto dikompresi dan metadata dihapus. Kamu bisa mencoba 3 analisis per hari tanpa akun; masuk untuk menyimpan lintas perangkat.</p>{analysisError && <div className="error-message" role="alert">{analysisError} <button onClick={() => { setEditor("manual"); setSearchOpen(true); }}>Cari manual</button></div>}{analysis && <PhotoReview analysis={analysis} draft={draft} corrections={corrections} savedMeals={savedMeals} selections={analysisSelections} extras={candidateExtras} aliases={analysisAliases} ignored={ignoredCandidates} confirmed={analysisConfirmed} answer={answer} photoFile={photoFile} analyzing={analyzing} onFood={addPhotoFood} onToggle={toggleCandidate} removedCandidates={removedScanCandidates} onDeleteCandidate={deleteScanCandidate} onPortion={updateCandidatePortion} onAlias={(index, alias) => { setAnalysisAliases((current) => ({ ...current, [index]: alias })); setAnalysisConfirmed(false); }} onCorrection={applyPersonalCorrection} onSaved={applyPersonalSaved} onAnswer={setAnswer} onReanalyze={(file) => void analyzePhoto(file)} onConfirm={setAnalysisConfirmed} />}</div>}
      {editor === "tersimpan" && <SavedMealLibrary savedMeals={savedMeals} recentMeals={recentMeals} recentFoods={recentFoods} frequentFoods={frequentFoods} deletingId={deletingSavedId} onCreate={() => { openEditor("manual"); setSavedFormOpen(true); setSavedCategory(mealType); }} onUseSaved={useSavedMeal} onEditSaved={editSavedCombination} onDeleteSaved={(saved) => void removeSavedCombination(saved)} onUseRecentMeal={(meal) => { openEditor("manual", meal.items, meal.title, meal.date); setMealType(meal.type); }} onUseFood={addShortcutFood} />}
      {(editor === "manual" || editor === "foto") && <><div className="editor-fields"><Field label="Jenis makan"><select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>{mealTypes.map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Tanggal"><input type="date" value={mealDate} onChange={(event) => setMealDate(event.target.value)} required /></Field><Field label="Jam"><input type="time" value={mealTime} onChange={(event) => setMealTime(event.target.value)} required /></Field><Field label="Nama catatan (opsional)"><input value={mealTitle} onChange={(event) => setMealTitle(event.target.value)} placeholder="Contoh: Makan siang di warteg" /></Field></div><div className="draft-heading"><div><h3>Periksa makanan & porsi</h3><p>Nilai mengikuti dasar gizi tiap makanan dan tetap merupakan perkiraan.</p></div></div>{editableDraft.length ? <div className="draft-list">{editableDraft.map((item) => <div className="draft-item" key={item.id}><div className="draft-item-top"><div className="food-badge"><UtensilsCrossed size={21} /></div><div className="draft-item-name"><label htmlFor={`name-${item.id}`}>Nama makanan</label><input id={`name-${item.id}`} value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} /><small>{item.source}</small></div><button onClick={() => removeDraftItem(item.id)} aria-label={`Hapus ${item.name}`} className="icon-button"><X size={18} /></button></div><DraftServing item={item} onUpdate={(patch) => updateItem(item.id, patch)} onUnit={(unit) => { setDraft((current) => current.map((entry) => entry.id === item.id ? changeServing(entry, unit) : entry)); setAnalysisConfirmed(false); }} /><div className="item-nutrition"><strong>{number(nutrientsFor(item).calories)} kkal</strong><span>P {number(nutrientsFor(item).protein)} Â· K {number(nutrientsFor(item).carbs)} Â· L {number(nutrientsFor(item).fat)} g</span></div></div>)}</div> : <div className="empty-draft"><UtensilsCrossed size={24} /><span>Belum ada makanan. Cari di katalog contoh atau buat entri sendiri.</span></div>}
      <button className="add-food-button" onClick={() => { setSearchOpen(!searchOpen); setCustomOpen(false); }}><Plus size={17} /> Tambah makanan</button>{searchOpen && <div className="food-search"><label className="search-input"><Search size={18} /><input placeholder="Cari nasi, ayam, tempe..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>{!query.trim() && <FoodShortcuts recent={recentFoods} frequent={frequentFoods} onAdd={addShortcutFood} />}<div className="food-results">{filteredFoods.map((food) => <button key={food.id} onClick={() => addFood(food)}><span><strong>{food.name}</strong><small>{food.category} Â· {food.source}</small></span><span>{number(food.per100g.calories)} kkal / 100 g <Plus size={16} /></span></button>)}{!filteredFoods.length && <p className="empty-inline">Tidak ada yang cocok. Kamu bisa membuat entri sendiri dari label gizi.</p>}</div><button className="text-button" onClick={() => { setCustomOpen(true); setSearchOpen(false); }}><Plus size={16} /> Buat makanan sendiri</button></div>}{customOpen && <div className="custom-form"><h4>Makanan sendiri</h4><p>Isi nilai dari label atau sumber yang kamu percaya, per 100 gram.</p><Field label="Nama makanan"><input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Contoh: Sup buatan rumah" /></Field><div className="custom-grid"><Field label="Kalori"><input type="number" min="0" value={customCalories} onChange={(event) => setCustomCalories(event.target.value)} /></Field><Field label="Protein (g)"><input type="number" min="0" value={customProtein} onChange={(event) => setCustomProtein(event.target.value)} /></Field><Field label="Karbo (g)"><input type="number" min="0" value={customCarbs} onChange={(event) => setCustomCarbs(event.target.value)} /></Field><Field label="Lemak (g)"><input type="number" min="0" value={customFat} onChange={(event) => setCustomFat(event.target.value)} /></Field></div><button className="primary-button" onClick={addCustom}>Tambahkan</button></div>}</>}
      {savedFormOpen && (editor === "manual" || editor === "foto") && <SavedMealForm editing={Boolean(savedEditingId)} title={savedTitle} note={savedNote} category={savedCategory} items={effectiveDraft} busy={savingSaved} onTitle={setSavedTitle} onNote={setSavedNote} onCategory={setSavedCategory} onSave={() => void saveCombination()} onCancel={() => { const original = savedMeals.find((entry) => entry.id === savedEditingId); if (original) setDraft(cloneItems(original.items)); setSavedFormOpen(false); setSavedEditingId(null); }} />}
      </div>{(editor === "manual" || editor === "foto") && <div className="editor-footer"><div className="draft-total"><small>TOTAL PERKIRAAN</small><strong>{number(total(effectiveDraft).calories)} <span>kkal</span></strong><span className="draft-macros">Protein {number(total(effectiveDraft).protein)} g / Karbo {number(total(effectiveDraft).carbs)} g / Lemak {number(total(effectiveDraft).fat)} g</span></div><div className="footer-buttons"><button className="outline-button save-combo" onClick={() => { if (!savedFormOpen) startSavedCombination(); }} disabled={!effectiveDraft.length || savedFormOpen || savingSaved || analysisNeedsReview}><Bookmark size={17} /> {savedFormOpen ? "Detail terbuka" : "Simpan kombinasi"}</button><button className="primary-button" onClick={saveMeal} disabled={!effectiveDraft.length || saving || savedFormOpen || storageMode === "loading" || storageMode === "error" || analysisNeedsReview}><Check size={18} /> {saving ? "Menyimpan..." : "Simpan catatan"}</button></div></div>}</section>}
  </div>;
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}>{icon}<span>{label}</span></button>; }
function DraftServing({ item, onUpdate, onUnit }: { item: MealItem; onUpdate: (patch: Partial<MealItem>) => void; onUnit: (unit: string) => void }) {
  if (item.packaged) return <div className="portion-row"><Field label="Jumlah"><input type="number" min="0.01" max="10000" step="0.01" value={item.quantity} onChange={(event) => { const quantity = Number(event.target.value); onUpdate({ quantity, grams: quantity }); }} /></Field><div className="portion-grams">{item.packaged.basis.unit === "serving" ? "sajian" : item.packaged.basis.unit} Â· dasar per {item.packaged.basis.amount} {item.packaged.basis.unit === "serving" ? "sajian" : item.packaged.basis.unit}</div></div>;
  return <div className="portion-row"><Field label="Jumlah"><input type="number" min="0.1" step="0.1" value={item.quantity} onChange={(event) => { const quantity = Number(event.target.value); onUpdate({ quantity, grams: quantity * item.gramsPerUnit }); }} /></Field><Field label="Satuan"><select value={item.unit} onChange={(event) => onUnit(event.target.value)}>{(allFoods.find((record) => record.id === item.foodId)?.servings ?? (item.unit === "gram" ? [] : [{ unit: item.unit, grams: item.gramsPerUnit }])).filter((serving) => serving.unit !== "gram").map((serving) => <option key={serving.unit}>{serving.unit}</option>)}<option value="gram">gram</option></select></Field><div className="portion-grams">â‰ˆ {number(item.grams)} g</div></div>;
}
function PageIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function EmptyState({ icon, title, description, action, onAction }: { icon: React.ReactNode; title: string; description: string; action: string; onAction: () => void }) { return <div className="empty-state"><span>{icon}</span><h2>{title}</h2><p>{description}</p><button className="primary-button" onClick={onAction}>{action}</button></div>; }
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d"); if (!context) throw new Error("Foto tidak dapat diproses. Coba file lain.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Foto tidak dapat diproses.")), "image/jpeg", .8));
}
