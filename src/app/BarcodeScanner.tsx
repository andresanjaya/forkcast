"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Barcode, Camera, Check, Search, X } from "lucide-react";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { BrowserMultiFormatOneDReader, type IScannerControls } from "@zxing/browser";
import { itemAmountLabel, mealTypes, type MealItem, type MealType, type OptionalNutrients } from "@/lib/food";
import { normalizeBarcode, packagedItem, type LookupResult, type PackagedProduct, type UserProduct } from "@/lib/packaged-food";
import type { FoodShortcut } from "@/lib/meal-memory";

type Props = { mealType: MealType; onMealType: (type: MealType) => void; recent: FoodShortcut[]; saved: UserProduct[]; signedIn: boolean; onAdd: (item: MealItem, product: PackagedProduct, remember: boolean) => void };
type Step = "start" | "scanning" | "loading" | "found" | "incomplete" | "not_found" | "error" | "manual" | "review";
const show = (value: number | null) => value === null ? "Tidak tersedia" : value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
const empty = { calories: "", protein: "", carbs: "", fat: "" };

function CameraFrame({ onDecoded, onFailure, onBack }: { onDecoded: (code: string) => void; onFailure: (message: string) => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onDecoded, onFailure });
  useEffect(() => { callbacks.current = { onDecoded, onFailure }; }, [onDecoded, onFailure]);
  useEffect(() => {
    let active = true;
    let controls: IScannerControls | null = null;
    const video = videoRef.current;
    const stop = () => { controls?.stop(); const stream = video?.srcObject; if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop()); if (video) video.srcObject = null; };
    const onHidden = () => { if (document.visibilityState === "hidden" && active) { active = false; stop(); callbacks.current.onFailure("Pemindaian dihentikan saat aplikasi tidak aktif. Buka kamera lagi atau masukkan kode manual."); } };
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !video) { callbacks.current.onFailure("Kamera barcode membutuhkan HTTPS dan akses kamera. Masukkan kode secara manual."); return stop; }
    document.addEventListener("visibilitychange", onHidden);
    const timeout = window.setTimeout(() => { if (active) callbacks.current.onFailure("Belum ada kode terbaca. Coba cahaya lebih terang atau masukkan kode manual."); }, 25000);
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
    const reader = new BrowserMultiFormatOneDReader(hints);
    reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" } } }, video, (result, _error, currentControls) => {
      if (!active || !result) return;
      const code = normalizeBarcode(result.getText());
      if (!code) { callbacks.current.onFailure("Kode terbaca tetapi format atau digit pemeriksanya tidak valid. Coba lagi atau masukkan kode manual."); return; }
      active = false; currentControls.stop(); stop(); callbacks.current.onDecoded(code);
    }).then((ready) => { controls = ready; if (!active) stop(); }).catch((error: unknown) => {
      if (!active) return;
      const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
      callbacks.current.onFailure(name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan kamera di pengaturan browser atau masukkan kode manual." : name === "NotFoundError" ? "Kamera tidak ditemukan. Masukkan kode manual." : name === "NotReadableError" ? "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut atau masukkan kode manual." : "Kamera tidak dapat dimulai. Masukkan kode manual.");
    });
    return () => { active = false; document.removeEventListener("visibilitychange", onHidden); window.clearTimeout(timeout); stop(); };
  }, [onDecoded, onFailure]);
  return <section className="barcode-camera"><div className="barcode-camera-head"><strong>Posisikan kode di dalam bingkai</strong><button type="button" className="icon-button" aria-label="Tutup kamera barcode" onClick={onBack}><X size={20} /></button></div><div className="barcode-viewport"><video ref={videoRef} autoPlay muted playsInline aria-label="Pratinjau kamera barcode" /><div className="barcode-frame" aria-hidden="true" /></div><p className="microcopy" role="status">Arahkan kamera ke EAN atau UPC. Pemindaian berhenti otomatis setelah 25 detik.</p></section>;
}

export default function BarcodeScanner(props: Props) {
  const [step, setStep] = useState<Step>("start");
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<PackagedProduct | null>(null);
  const [amount, setAmount] = useState("1");
  const [remember, setRemember] = useState(false);
  const [manual, setManual] = useState({ name: "", brand: "", barcode: "", packageQuantity: "", servingSize: "", note: "", basis: "g" as "g" | "ml" | "serving", amount: "100", ...empty });
  const requestRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);
  useEffect(() => () => requestRef.current?.abort(), []);

  function openProduct(value: PackagedProduct, next: Step = "found") { setProduct(value); setAmount(String(value.suggestedAmount)); setStep(next); setError(""); }
  function manualForm(prefill?: PackagedProduct) {
    const knownBasis = prefill?.basisKnown !== false;
    setManual(prefill ? { name: prefill.name, brand: prefill.brand, barcode: prefill.barcode ?? "", packageQuantity: prefill.packageQuantity, servingSize: prefill.servingSize, note: prefill.note, basis: knownBasis ? prefill.basis.unit : "g", amount: knownBasis ? String(prefill.suggestedAmount) : "100", ...empty } : { name: "", brand: "", barcode: code ?? codeInput, packageQuantity: "", servingSize: "", note: "", basis: "g", amount: "100", ...empty });
    setStep("manual"); setError("");
  }
  async function lookup(raw: string) {
    const normalized = normalizeBarcode(raw);
    if (!normalized) { setError("Kode harus EAN-8, UPC-A, UPC-E, atau EAN-13 dengan digit pemeriksa yang valid."); setStep("start"); return; }
    if (pendingRef.current) return;
    pendingRef.current = true; setCode(normalized); setCodeInput(normalized); setStep("loading"); setError("");
    requestRef.current?.abort(); const controller = new AbortController(); requestRef.current = controller;
    try {
      const response = await fetch(`/api/product/${normalized}`, { signal: controller.signal, cache: "no-store" });
      const body = await response.json() as LookupResult & { error?: string };
      if (!response.ok) throw new Error(body.error || "Pencarian gagal. Isi label kemasan secara manual.");
      if (body.status === "not_found") setStep("not_found");
      else openProduct(body.product, body.status);
    } catch (reason) {
      if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Pencarian gagal."); setStep("error"); }
    } finally { pendingRef.current = false; }
  }
  const onDecoded = (value: string) => { void lookup(value); };
  const onFailure = (message: string) => { setError(message); setStep("start"); };
  const amountNumber = Number(amount);
  const validAmount = amount.trim() !== "" && Number.isFinite(amountNumber) && amountNumber > 0 && amountNumber <= 10000;
  const currentItem = product && product.basisKnown !== false && Object.values(product.nutrients).some((value) => value !== null) && validAmount ? packagedItem(product, amountNumber) : null;
  const totals = currentItem ? currentItem.packaged && { calories: currentItem.packaged.nutrients.calories === null ? null : currentItem.packaged.nutrients.calories * amountNumber / product!.basis.amount, protein: currentItem.packaged.nutrients.protein === null ? null : currentItem.packaged.nutrients.protein * amountNumber / product!.basis.amount, carbs: currentItem.packaged.nutrients.carbs === null ? null : currentItem.packaged.nutrients.carbs * amountNumber / product!.basis.amount, fat: currentItem.packaged.nutrients.fat === null ? null : currentItem.packaged.nutrients.fat * amountNumber / product!.basis.amount } : null;
  const numeric = (value: string, max: number) => value === "" || Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max;
  const manualError = !manual.name.trim() ? "Nama produk wajib diisi." : manual.name.length > 160 ? "Nama terlalu panjang." : manual.barcode.trim() && !normalizeBarcode(manual.barcode) ? "Kode batang tidak valid." : !numeric(manual.calories, 10000) || !numeric(manual.protein, 1000) || !numeric(manual.carbs, 1000) || !numeric(manual.fat, 1000) ? "Periksa angka gizi pada label." : [manual.calories, manual.protein, manual.carbs, manual.fat].every((value) => !value.trim()) ? "Isi setidaknya satu nilai gizi dari label." : !numeric(manual.amount, 10000) || Number(manual.amount) <= 0 ? "Jumlah harus lebih dari nol." : null;
  function reviewManual() {
    if (manualError) { setError(manualError); return; }
    const nutrients = Object.fromEntries((["calories", "protein", "carbs", "fat"] as const).map((key) => [key, manual[key].trim() ? Number(manual[key]) : null])) as OptionalNutrients;
    openProduct({ name: manual.name.trim(), brand: manual.brand.trim(), barcode: manual.barcode.trim() ? normalizeBarcode(manual.barcode) : null, packageQuantity: manual.packageQuantity.trim(), servingSize: manual.servingSize.trim(), basis: { amount: manual.basis === "serving" ? 1 : 100, unit: manual.basis }, nutrients, provider: "Label kemasan pengguna", sourceUrl: null, lookedUpAt: null, note: manual.note.trim() || "Nilai disalin pengguna dari label kemasan.", suggestedAmount: Number(manual.amount), userEdited: true, basisKnown: true }, "review");
  }
  const recent = props.signedIn ? props.recent.filter((entry) => entry.item.packaged).slice(0, 4) : [];

  return <section className="barcode-panel panel" aria-label="Scan produk kemasan">
    <span className="card-kicker">PRODUK KEMASAN</span><h3>Scan barcode</h3>
    {step === "start" && <><p className="microcopy">Barcode membantu mencari produk. Selalu cocokkan hasil dengan kemasanmu.</p><button className="primary-button barcode-action" type="button" onClick={() => { setError(""); setStep("scanning"); }}><Camera size={17} /> Buka kamera barcode</button><form onSubmit={(event) => { event.preventDefault(); void lookup(codeInput); }}><label className="field">Atau masukkan kode EAN / UPC<input inputMode="numeric" autoComplete="off" value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="Contoh: 899..." /></label><button className="outline-button barcode-action" type="submit"><Search size={16} /> Cari produk</button></form>{error && <p className="error-message" role="alert">{error}</p>}<button className="text-button" type="button" onClick={() => manualForm()}>Kode tidak terbaca? Isi label kemasan</button>{props.signedIn && (recent.length > 0 || props.saved.length > 0) && <div className="barcode-recent"><h4>Produkmu sebelumnya</h4>{props.saved.slice(0, 4).map((entry) => <button key={entry.id} type="button" onClick={() => openProduct(entry.product, "review")}>{entry.product.name}<small>{entry.product.brand || "Produk tersimpan"}</small></button>)}{recent.map((entry) => <button key={entry.key} type="button" onClick={() => { const snapshot = entry.item.packaged!; openProduct({ ...snapshot, name: entry.item.name.replace(snapshot.brand ? `${snapshot.brand} · ` : "", ""), suggestedAmount: entry.item.grams }, "review"); }}>{entry.item.name}<small>{itemAmountLabel(entry.item)} terakhir</small></button>)}</div>}</>}
    {step === "scanning" && <CameraFrame onDecoded={onDecoded} onFailure={onFailure} onBack={() => setStep("start")} />}
    {step === "loading" && <div className="barcode-state" role="status"><Barcode size={26} /><strong>Kode {code} terbaca</strong><p>Mencari produk…</p></div>}
    {(step === "not_found" || step === "error") && <div className="barcode-state" role="status"><Barcode size={26} /><strong>{step === "not_found" ? "Produk belum ditemukan" : "Pencarian belum tersedia"}</strong><p>{error || `Kode ${code} belum ada di sumber produk.`}</p><button className="primary-button" type="button" onClick={() => manualForm()}>Isi label kemasan</button><button className="text-button" type="button" onClick={() => setStep("start")}>Coba kode lain</button></div>}
    {(step === "found" || step === "incomplete" || step === "review") && product && <><button className="text-button" type="button" onClick={() => step === "review" && product.provider === "Label kemasan pengguna" ? setStep("manual") : setStep("start")}><ArrowLeft size={15} /> Kembali</button><div className="barcode-product"><strong>{step === "incomplete" ? "Data gizi belum lengkap" : "Periksa produk"}</strong><label className="field">Nama produk<input maxLength={160} value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value, userEdited: true })} /></label><label className="field">Merek<input maxLength={120} value={product.brand} onChange={(event) => setProduct({ ...product, brand: event.target.value, userEdited: true })} /></label><p>Kode: {product.barcode ?? "Tidak ada"} · Kemasan: {product.packageQuantity || "Tidak tersedia"}</p><p>Ukuran sajian tercatat: {product.servingSize || "Tidak tersedia"}</p><p>Dasar gizi: per {product.basis.amount} {product.basis.unit === "serving" ? "sajian" : product.basis.unit}</p><label className="field">{product.basis.unit === "serving" ? "Jumlah sajian" : `Jumlah ${product.basis.unit}`}<input type="number" min="0.01" max="10000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><div className="barcode-nutrition" aria-live="polite"><strong>{show(totals?.calories ?? null)} kkal</strong><span>Protein {show(totals?.protein ?? null)} g</span><span>Karbo {show(totals?.carbs ?? null)} g</span><span>Lemak {show(totals?.fat ?? null)} g</span></div><p className="microcopy">Sumber: {product.provider}{product.userEdited && product.provider === "Open Food Facts" ? " · dikoreksi pengguna" : ""}{product.lookedUpAt ? ` · diambil ${new Date(product.lookedUpAt).toLocaleDateString("id-ID")}` : ""}. {product.note} Nilai dan varian dapat berbeda dari label di tanganmu.</p>{product.sourceUrl && <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">Lihat sumber Open Food Facts</a>}{step === "incomplete" && <p className="error-message">{product.basisKnown === false ? "Dasar gizi tidak jelas. Isi nilai dari label sebelum menambahkan." : "Sebagian nilai tidak tersedia. Nilai kosong akan tetap tidak diketahui dalam catatan."}</p>}</div><label className="field barcode-meal-type">Masukkan ke<select value={props.mealType} onChange={(event) => props.onMealType(event.target.value as MealType)}>{mealTypes.map((type) => <option key={type}>{type}</option>)}</select></label>{props.signedIn && <label className="barcode-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Simpan sebagai produk pribadiku setelah catatan tersimpan</label>}<div className="barcode-actions"><button className="primary-button" type="button" disabled={!currentItem || !product.name.trim() || product.name.length > 160} onClick={() => { if (!currentItem) return; props.onAdd(currentItem, product, remember); }}><Check size={16} /> Tambahkan ke catatan</button><button className="outline-button" type="button" onClick={() => manualForm(product)}>Koreksi dari label kemasan</button></div></>}
    {step === "manual" && <><button className="text-button" type="button" onClick={() => setStep("start")}><ArrowLeft size={15} /> Kembali</button><h4>Isi dari label kemasan</h4><p className="microcopy">Kosongkan nilai yang tidak tercantum. Tidak ada angka yang diisi otomatis.</p><div className="barcode-form"><label className="field">Nama produk *<input maxLength={160} value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} /></label><label className="field">Merek<input maxLength={120} value={manual.brand} onChange={(event) => setManual({ ...manual, brand: event.target.value })} /></label><label className="field">Barcode (opsional)<input inputMode="numeric" value={manual.barcode} onChange={(event) => setManual({ ...manual, barcode: event.target.value })} /></label><label className="field">Ukuran kemasan (opsional)<input maxLength={80} value={manual.packageQuantity} onChange={(event) => setManual({ ...manual, packageQuantity: event.target.value })} placeholder="Contoh: 250 ml" /></label><label className="field">Dasar nilai pada label<select value={manual.basis} onChange={(event) => setManual({ ...manual, basis: event.target.value as typeof manual.basis, amount: event.target.value === "serving" ? "1" : "100" })}><option value="g">Per 100 g</option><option value="ml">Per 100 ml</option><option value="serving">Per sajian</option></select></label><label className="field">Ukuran sajian pada label (opsional)<input maxLength={80} value={manual.servingSize} onChange={(event) => setManual({ ...manual, servingSize: event.target.value })} placeholder="Contoh: 30 g" /></label><label className="field">Jumlah yang dimakan ({manual.basis === "serving" ? "sajian" : manual.basis})<input type="number" min="0.01" max="10000" step="0.01" value={manual.amount} onChange={(event) => setManual({ ...manual, amount: event.target.value })} /></label><div className="barcode-macro-fields">{(["calories", "protein", "carbs", "fat"] as const).map((key) => <label className="field" key={key}>{key === "calories" ? "Kalori (kkal)" : key === "protein" ? "Protein (g)" : key === "carbs" ? "Karbohidrat (g)" : "Lemak (g)"}<input type="number" min="0" step="0.01" value={manual[key]} onChange={(event) => setManual({ ...manual, [key]: event.target.value })} placeholder="Tidak tersedia" /></label>)}</div><label className="field">Catatan (opsional)<input maxLength={200} value={manual.note} onChange={(event) => setManual({ ...manual, note: event.target.value })} /></label></div>{error && <p className="error-message" role="alert">{error}</p>}<button className="primary-button barcode-action" type="button" onClick={reviewManual}>Tinjau sebelum menambah</button></>}
  </section>;
}
