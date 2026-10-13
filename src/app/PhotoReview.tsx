"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState } from "react";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { itemAmountLabel, nutrientsFor, total, type MealItem, type SavedMeal } from "@/lib/food";
import { findPersonalMatch, type FoodCorrection } from "@/lib/meal-memory";
import { photoReviewState, validPhotoItem } from "@/lib/photo-review";
import PhotoFoodSearch from "./PhotoFoodSearch";
import SwipeDeleteRow from "@/components/forkcast/SwipeDeleteRow";
import { Field, FieldLabel } from "@/components/ui/field";
import { tr, useLanguage } from "@/lib/language";

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
  const { language } = useLanguage();
  const [searchTarget, setSearchTarget] = useState<number | "extra" | null>(null);
  const [manualFirst, setManualFirst] = useState(false);
  const review = photoReviewState(props.analysis.items.length, props.selections, props.ignored, props.draft, props.extras);
  const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString(language);
  function openSearch(index: number | "extra", manual = false) { setSearchTarget(index); setManualFirst(manual); }
  function addFood(index: number | null, item: MealItem) { props.onFood(index, item); setSearchTarget(null); }
  return <div className="analysis-result">
    <div className="analysis-label"><Sparkles size={17} /> {tr(language, "KANDIDAT DARI FOTO", "PHOTO CANDIDATES")}</div>
    <p>{language === "en-US" ? "Photo suggestions are estimates. Review each food and portion before saving." : props.analysis.disclaimer}</p>
    {props.analysis.items.map((candidate, index) => ({ candidate, index })).filter(({ index }) => !props.removedCandidates.includes(index)).map(({ candidate, index }) => {
      const match = findPersonalMatch(candidate.candidateName, props.corrections, props.savedMeals);
      const selected = props.draft.find((item) => item.id === props.selections[index]);
      const ignored = props.ignored.includes(index);
      return <SwipeDeleteRow className="fc-scan-ingredient-swipe" key={`${candidate.candidateName}-${index}`} label={`${tr(language, "Hapus", "Delete")} ${candidate.candidateName}`} onDelete={() => props.onDeleteCandidate(index)}><div className={`candidate review-candidate${ignored ? " is-ignored" : ""}`}>
        <div className="candidate-top"><strong>{candidate.candidateName}</strong><span className={`candidate-status ${ignored ? "excluded" : selected && validPhotoItem(selected) ? "included" : "pending"}`}>{ignored ? tr(language, "Tidak dihitung", "Excluded") : selected ? validPhotoItem(selected) ? tr(language, "Masuk total", "Included in total") : tr(language, "Periksa porsi", "Check portion") : tr(language, "Belum dipadankan", "Unmatched")}</span></div>
        <span>{candidate.estimatedServing.gramsMin}–{candidate.estimatedServing.gramsMax} g · {tr(language, "keyakinan", "confidence")} {candidate.confidence === "high" ? tr(language, "tinggi", "high") : candidate.confidence === "low" ? tr(language, "rendah", "low") : tr(language, "sedang", "medium")}</span>
        <small>{candidate.visibleNotes}</small>
        <Field><FieldLabel className="candidate-include"><input type="checkbox" checked={!ignored} onChange={(event) => props.onToggle(index, event.target.checked)} /> {tr(language, "Masukkan ke perhitungan", "Include in calculation")}</FieldLabel></Field>
        <div className="candidate-match"><span>{tr(language, "Padanan nutrisi", "Nutrition match")}</span><strong>{selected ? `${selected.name} · ${number(selected.grams)} g` : tr(language, "Belum dipilih", "Not selected")}</strong></div>
        {!ignored && selected && <Field><FieldLabel className="candidate-portion">{tr(language, "Porsi yang dihitung (g)", "Counted portion (g)")}<input type="number" min="1" max="10000" step="1" value={selected.grams} onChange={(event) => props.onPortion(index, Number(event.target.value))} /></FieldLabel></Field>}
        {!ignored && !selected && <p className="candidate-warning">{tr(language, "Belum masuk total nutrisi. Pilih padanan atau isi nilai gizi manual.", "Not included in nutrition totals. Choose a match or enter nutrition values manually.")}</p>}
        {!ignored && selected && !validPhotoItem(selected) && <p className="candidate-warning">{tr(language, "Porsi atau data nutrisi belum valid. Perbaiki agar item ini dapat dihitung.", "Portion or nutrition data is invalid. Correct it so this item can be counted.")}</p>}
        <div className="candidate-actions"><button type="button" className="outline-button" onClick={() => openSearch(index)}>{selected ? tr(language, "Ganti padanan", "Change match") : tr(language, "Cari di database", "Search database")}</button><button type="button" className="outline-button" onClick={() => openSearch(index, true)}>{tr(language, "Input manual", "Manual entry")}</button></div>
        {match && !ignored && <div className="personal-match"><span>{tr(language, "Dari riwayatmu", "From your history")}: {match.kind === "correction" ? `${tr(language, "terakhir kamu catat sebagai", "last logged as")} ${match.correction.item.name} (${itemAmountLabel(match.correction.item)})` : `${tr(language, "kombinasi", "combination")} “${match.saved.title}”`}. {tr(language, "Periksa lagi sebelum menyimpan.", "Review again before saving.")}</span><button className="text-button" onClick={() => match.kind === "correction" ? props.onCorrection(index, match.correction) : props.onSaved(index, match.saved)}>{tr(language, "Gunakan pilihan ini", "Use this choice")} <ArrowRight size={14} /></button></div>}
        {selected && !ignored && <Field><FieldLabel className="candidate-select">{tr(language, "Nama panggilan untuk lain kali (opsional)", "Nickname for next time (optional)")}<input maxLength={100} value={props.aliases[index] ?? ""} onChange={(event) => props.onAlias(index, event.target.value)} placeholder={tr(language, "Contoh: ayam rumah", "Example: home-style chicken")} /></FieldLabel></Field>}
        {ignored && <p className="candidate-ignored-note">{tr(language, "Item ini tetap terlihat untuk ditinjau, tetapi tidak masuk catatan atau total nutrisi.", "This item remains visible for review but is not saved or counted in nutrition totals.")}</p>}
      </div></SwipeDeleteRow>;
    })}
    <button type="button" className="add-food-button review-add-component" onClick={() => openSearch("extra")}><Plus size={17} /> {tr(language, "Tambah komponen yang terlewat", "Add a missing food")}</button>
    <p className="review-component-hint">{tr(language, "Misalnya kuah sop, timun, tomat, atau pelengkap lain. Setelah ditambahkan, sesuaikan porsinya di daftar makanan.", "For example, soup broth, cucumber, tomato, or another side. Adjust the portion after adding it.")}</p>
    {props.analysis.followUpQuestion && <Field className="followup"><FieldLabel htmlFor="followup-answer">{props.analysis.followUpQuestion}</FieldLabel><input id="followup-answer" value={props.answer} onChange={(event) => props.onAnswer(event.target.value)} placeholder={tr(language, "Contoh: ayamnya digoreng", "Example: the chicken was fried")} />{props.photoFile && <button className="text-button" onClick={() => props.onReanalyze(props.photoFile!)} disabled={props.analyzing || !props.answer.trim()}>{tr(language, "Analisis ulang dengan jawaban", "Analyze again with answer")} <ArrowRight size={15} /></button>}</Field>}
    <div className="photo-save-summary" aria-live="polite"><h3>{tr(language, "Yang akan masuk catatan", "Foods to be logged")}</h3>
      {review.included.length ? <ul>{review.included.map((item) => <li key={item.id}><span>{item.name} · {number(item.grams)} g</span><strong>{number(nutrientsFor(item).calories)} {tr(language, "kkal", "kcal")}</strong></li>)}</ul> : <p>{tr(language, "Belum ada makanan dengan nilai gizi yang akan disimpan.", "No foods with nutrition values will be saved yet.")}</p>}
      <p><strong>{tr(language, "Total", "Total")} {number(total(review.included).calories)} {tr(language, "kkal", "kcal")}</strong> {tr(language, "dari", "from")} {review.included.length} {tr(language, "item yang dihitung.", "counted items.")}</p>
      {review.unresolved.length > 0 && <div className="summary-warning"><strong>{tr(language, "Belum dipadankan dan belum masuk total:", "Unmatched and not included in totals:")}</strong> {review.unresolved.map((index) => props.analysis.items[index].candidateName).join(", ")}. {tr(language, "Cari padanan, isi manual, atau hapus centangnya sebelum menyimpan.", "Choose a match, enter values manually, or uncheck it before saving.")}</div>}
      {review.invalid.length > 0 && <div className="summary-warning"><strong>{tr(language, "Perlu perbaikan porsi atau nutrisi:", "Portion or nutrition needs correction:")}</strong> {review.invalid.map((item) => item.name).join(", ")}. {tr(language, "Item ini belum masuk total.", "This item is not included in totals yet.")}</div>}
      {props.ignored.length > 0 && <div className="summary-excluded"><strong>{tr(language, "Tidak dihitung:", "Excluded:")}</strong> {props.ignored.map((index) => props.analysis.items[index]?.candidateName).filter(Boolean).join(", ")}. {tr(language, "Item ini tidak akan disimpan.", "This item will not be saved.")}</div>}
    </div>
    <Sheet open={searchTarget !== null} onOpenChange={(open) => { if (!open) setSearchTarget(null); }}><SheetContent side="bottom" className="fc-search-sheet"><SheetHeader><SheetTitle>{manualFirst ? tr(language, "Input makanan manual", "Manual food entry") : tr(language, "Pilih padanan makanan", "Choose a food match")}</SheetTitle><SheetDescription>{tr(language, "Cari padanan, periksa porsi, atau isi nilai gizi sendiri.", "Search for a match, check the portion, or enter nutrition values yourself.")}</SheetDescription></SheetHeader>{searchTarget !== null && <PhotoFoodSearch key={`${searchTarget}-${manualFirst}`} candidateName={typeof searchTarget === "number" ? props.analysis.items[searchTarget].candidateName : ""} estimatedGrams={typeof searchTarget === "number" ? Math.max(1, Math.round((props.analysis.items[searchTarget].estimatedServing.gramsMin + props.analysis.items[searchTarget].estimatedServing.gramsMax) / 2)) : undefined} estimatedNutritionPer100g={typeof searchTarget === "number" ? props.analysis.items[searchTarget].estimatedNutritionPer100g : undefined} nutritionConfidence={typeof searchTarget === "number" ? props.analysis.items[searchTarget].nutritionConfidence : undefined} manualFirst={manualFirst} onFood={(item) => addFood(typeof searchTarget === "number" ? searchTarget : null, item)} onClose={() => setSearchTarget(null)} />}</SheetContent></Sheet>
    <Field><FieldLabel className="review-confirm"><input type="checkbox" checked={props.confirmed} disabled={review.unresolved.length > 0 || review.invalid.length > 0 || review.included.length === 0} onChange={(event) => props.onConfirm(event.target.checked)} /> {tr(language, "Saya sudah memeriksa item yang masuk perhitungan, padanan nutrisi, dan porsinya.", "I have reviewed the included foods, nutrition matches, and portions.")}</FieldLabel></Field>
  </div>;
}
