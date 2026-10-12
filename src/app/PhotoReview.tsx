"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState } from "react";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { itemAmountLabel, nutrientsFor, total, type MealItem, type SavedMeal } from "@/lib/food";
import { findPersonalMatch, type FoodCorrection } from "@/lib/meal-memory";
import { photoReviewState, validPhotoItem } from "@/lib/photo-review";
import PhotoFoodSearch from "./PhotoFoodSearch";
import SwipeDeleteRow from "@/components/forkcast/SwipeDeleteRow";

export type Analysis = {
  items: {
    candidateName: string;
    estimatedServing: { value: number; unit: string; gramsMin: number; gramsMax: number };
    estimatedNutritionPer100g: { calories: number; protein: number; carbs: number; fat: number };
    nutritionConfidence: "low" | "medium" | "high";
    visibleNotes: string;
    confidence: string;
    needsConfirmation: boolean;
  }[];
  followUpQuestion?: string;
  disclaimer: string;
  demo: boolean;
};

export type PhotoReviewProps = {
  analysis: Analysis;
  draft: MealItem[];
  corrections: FoodCorrection[];
  savedMeals: SavedMeal[];
  selections: Record<number, string>;
  extras: Record<number, string[]>;
  aliases: Record<number, string>;
  ignored: number[];
  removedCandidates: number[];
  confirmed: boolean;
  answer: string;
  photoFile: File | null;
  analyzing: boolean;
  onFood: (index: number | null, item: MealItem) => void;
  onToggle: (index: number, included: boolean) => void;
  onDeleteCandidate: (index: number) => void;
  onPortion: (index: number, grams: number) => void;
  onAlias: (index: number, alias: string) => void;
  onCorrection: (index: number, correction: FoodCorrection) => void;
  onSaved: (index: number, saved: SavedMeal) => void;
  onAnswer: (answer: string) => void;
  onReanalyze: (file: File) => void;
  onConfirm: (confirmed: boolean) => void;
};

export default function PhotoReview(props: PhotoReviewProps) {
  const [searchTarget, setSearchTarget] = useState<number | "extra" | null>(null);
  const [manualFirst, setManualFirst] = useState(false);
  const review = photoReviewState(props.analysis.items.length, props.selections, props.ignored, props.draft, props.extras);
  const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString("id-ID");
  function openSearch(index: number | "extra", manual = false) { setSearchTarget(index); setManualFirst(manual); }
  function addFood(index: number | null, item: MealItem) { props.onFood(index, item); setSearchTarget(null); }
  return <div className="analysis-result">
    <div className="analysis-label"><Sparkles size={17} /> KANDIDAT DARI FOTO</div>
    <p>{props.analysis.disclaimer}</p>
    {props.analysis.items.map((candidate, index) => ({ candidate, index })).filter(({ index }) => !props.removedCandidates.includes(index)).map(({ candidate, index }) => {
      const match = findPersonalMatch(candidate.candidateName, props.corrections, props.savedMeals);
      const selected = props.draft.find((item) => item.id === props.selections[index]);
      const ignored = props.ignored.includes(index);
      return <SwipeDeleteRow className="fc-scan-ingredient-swipe" key={`${candidate.candidateName}-${index}`} label={`Hapus ${candidate.candidateName}`} onDelete={() => props.onDeleteCandidate(index)}><div className={`candidate review-candidate${ignored ? " is-ignored" : ""}`}>
        <div className="candidate-top"><strong>{candidate.candidateName}</strong><span className={`candidate-status ${ignored ? "excluded" : selected && validPhotoItem(selected) ? "included" : "pending"}`}>{ignored ? "Tidak dihitung" : selected ? validPhotoItem(selected) ? "Masuk total" : "Periksa porsi" : "Belum dipadankan"}</span></div>
        <span>{candidate.estimatedServing.gramsMin}–{candidate.estimatedServing.gramsMax} g · keyakinan {candidate.confidence === "high" ? "tinggi" : candidate.confidence === "low" ? "rendah" : "sedang"}</span>
        <small>{candidate.visibleNotes}</small>
        <label className="candidate-include"><input type="checkbox" checked={!ignored} onChange={(event) => props.onToggle(index, event.target.checked)} /> Masukkan ke perhitungan</label>
        <div className="candidate-match"><span>Padanan nutrisi</span><strong>{selected ? `${selected.name} · ${number(selected.grams)} g` : "Belum dipilih"}</strong></div>
        {!ignored && selected && <label className="candidate-portion">Porsi yang dihitung (g)<input type="number" min="1" max="10000" step="1" value={selected.grams} onChange={(event) => props.onPortion(index, Number(event.target.value))} /></label>}
        {!ignored && !selected && <p className="candidate-warning">Belum masuk total nutrisi. Pilih padanan atau isi nilai gizi manual.</p>}
        {!ignored && selected && !validPhotoItem(selected) && <p className="candidate-warning">Porsi atau data nutrisi belum valid. Perbaiki agar item ini dapat dihitung.</p>}
        <div className="candidate-actions"><button type="button" className="outline-button" onClick={() => openSearch(index)}>{selected ? "Ganti padanan" : "Cari di database"}</button><button type="button" className="outline-button" onClick={() => openSearch(index, true)}>Input manual</button></div>
        {match && !ignored && <div className="personal-match"><span>Dari riwayatmu: {match.kind === "correction" ? `terakhir kamu catat sebagai ${match.correction.item.name} (${itemAmountLabel(match.correction.item)})` : `kombinasi “${match.saved.title}”`}. Periksa lagi sebelum menyimpan.</span><button className="text-button" onClick={() => match.kind === "correction" ? props.onCorrection(index, match.correction) : props.onSaved(index, match.saved)}>Gunakan pilihan ini <ArrowRight size={14} /></button></div>}
        {selected && !ignored && <label className="candidate-select">Nama panggilan untuk lain kali (opsional)<input maxLength={100} value={props.aliases[index] ?? ""} onChange={(event) => props.onAlias(index, event.target.value)} placeholder="Contoh: ayam rumah" /></label>}
        {ignored && <p className="candidate-ignored-note">Item ini tetap terlihat untuk ditinjau, tetapi tidak masuk catatan atau total nutrisi.</p>}
      </div></SwipeDeleteRow>;
    })}
    <button type="button" className="add-food-button review-add-component" onClick={() => openSearch("extra")}><Plus size={17} /> Tambah komponen yang terlewat</button>
    <p className="review-component-hint">Misalnya kuah sop, timun, tomat, atau pelengkap lain. Setelah ditambahkan, sesuaikan porsinya di daftar makanan.</p>
    {props.analysis.followUpQuestion && <div className="followup"><label htmlFor="followup-answer">{props.analysis.followUpQuestion}</label><input id="followup-answer" value={props.answer} onChange={(event) => props.onAnswer(event.target.value)} placeholder="Contoh: ayamnya digoreng" />{props.photoFile && <button className="text-button" onClick={() => props.onReanalyze(props.photoFile!)} disabled={props.analyzing || !props.answer.trim()}>Analisis ulang dengan jawaban <ArrowRight size={15} /></button>}</div>}
    <div className="photo-save-summary" aria-live="polite"><h3>Yang akan masuk catatan</h3>
      {review.included.length ? <ul>{review.included.map((item) => <li key={item.id}><span>{item.name} · {number(item.grams)} g</span><strong>{number(nutrientsFor(item).calories)} kkal</strong></li>)}</ul> : <p>Belum ada makanan dengan nilai gizi yang akan disimpan.</p>}
      <p><strong>Total {number(total(review.included).calories)} kkal</strong> dari {review.included.length} item yang dihitung.</p>
      {review.unresolved.length > 0 && <div className="summary-warning"><strong>Belum dipadankan dan belum masuk total:</strong> {review.unresolved.map((index) => props.analysis.items[index].candidateName).join(", ")}. Cari padanan, isi manual, atau hapus centangnya sebelum menyimpan.</div>}
      {review.invalid.length > 0 && <div className="summary-warning"><strong>Perlu perbaikan porsi atau nutrisi:</strong> {review.invalid.map((item) => item.name).join(", ")}. Item ini belum masuk total.</div>}
      {props.ignored.length > 0 && <div className="summary-excluded"><strong>Tidak dihitung:</strong> {props.ignored.map((index) => props.analysis.items[index]?.candidateName).filter(Boolean).join(", ")}. Item ini tidak akan disimpan.</div>}
    </div>
    <Sheet open={searchTarget !== null} onOpenChange={(open) => { if (!open) setSearchTarget(null); }}><SheetContent side="bottom" className="fc-search-sheet"><SheetHeader><SheetTitle>{manualFirst ? "Input makanan manual" : "Pilih padanan makanan"}</SheetTitle><SheetDescription>Cari padanan, periksa porsi, atau isi nilai gizi sendiri.</SheetDescription></SheetHeader>{searchTarget !== null && <PhotoFoodSearch key={`${searchTarget}-${manualFirst}`} candidateName={typeof searchTarget === "number" ? props.analysis.items[searchTarget].candidateName : ""} estimatedGrams={typeof searchTarget === "number" ? Math.max(1, Math.round((props.analysis.items[searchTarget].estimatedServing.gramsMin + props.analysis.items[searchTarget].estimatedServing.gramsMax) / 2)) : undefined} estimatedNutritionPer100g={typeof searchTarget === "number" ? props.analysis.items[searchTarget].estimatedNutritionPer100g : undefined} nutritionConfidence={typeof searchTarget === "number" ? props.analysis.items[searchTarget].nutritionConfidence : undefined} manualFirst={manualFirst} onFood={(item) => addFood(typeof searchTarget === "number" ? searchTarget : null, item)} onClose={() => setSearchTarget(null)} />}</SheetContent></Sheet>
    <label className="review-confirm"><input type="checkbox" checked={props.confirmed} disabled={review.unresolved.length > 0 || review.invalid.length > 0 || review.included.length === 0} onChange={(event) => props.onConfirm(event.target.checked)} /> Saya sudah memeriksa item yang masuk perhitungan, padanan nutrisi, dan porsinya.</label>
  </div>;
}
