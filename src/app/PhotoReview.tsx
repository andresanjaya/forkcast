"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { itemAmountLabel, type MealItem, type SavedMeal } from "@/lib/food";
import { findPersonalMatch, type FoodCorrection } from "@/lib/meal-memory";

export type Analysis = {
  items: {
    candidateName: string;
    estimatedServing: { value: number; unit: string; gramsMin: number; gramsMax: number };
    visibleNotes: string;
    confidence: string;
    needsConfirmation: boolean;
  }[];
  followUpQuestion?: string;
  disclaimer: string;
  demo: boolean;
};

type Props = {
  analysis: Analysis;
  draft: MealItem[];
  corrections: FoodCorrection[];
  savedMeals: SavedMeal[];
  selections: Record<number, string>;
  aliases: Record<number, string>;
  unmatched: number[];
  ignored: number[];
  confirmed: boolean;
  answer: string;
  photoFile: File | null;
  analyzing: boolean;
  onSelect: (index: number, itemId: string) => void;
  onAlias: (index: number, alias: string) => void;
  onCorrection: (index: number, correction: FoodCorrection) => void;
  onSaved: (index: number, saved: SavedMeal) => void;
  onIgnore: (index: number) => void;
  onSearch: () => void;
  onAnswer: (answer: string) => void;
  onReanalyze: (file: File) => void;
  onConfirm: (confirmed: boolean) => void;
};

export default function PhotoReview(props: Props) {
  const unresolved = props.analysis.items.some((_, index) => !props.ignored.includes(index) && !props.draft.some((item) => item.id === props.selections[index]));
  return <div className="analysis-result">
    <div className="analysis-label"><Sparkles size={17} /> KANDIDAT DARI FOTO</div>
    <p>{props.analysis.disclaimer}</p>
    {props.analysis.items.map((candidate, index) => {
      const match = findPersonalMatch(candidate.candidateName, props.corrections, props.savedMeals);
      return <div className="candidate" key={`${candidate.candidateName}-${index}`}>
        <strong>{candidate.candidateName}</strong>
        <span>{candidate.estimatedServing.gramsMin}–{candidate.estimatedServing.gramsMax} g · keyakinan {candidate.confidence === "high" ? "tinggi" : candidate.confidence === "low" ? "rendah" : "sedang"}</span>
        <small>{candidate.visibleNotes}</small>
        {match && <div className="personal-match"><span>Dari riwayatmu: {match.kind === "correction" ? `terakhir kamu catat sebagai ${match.correction.item.name} (${itemAmountLabel(match.correction.item)})` : `kombinasi “${match.saved.title}”`}. Periksa lagi sebelum menyimpan.</span><button className="text-button" onClick={() => match.kind === "correction" ? props.onCorrection(index, match.correction) : props.onSaved(index, match.saved)}>Gunakan pilihan ini <ArrowRight size={14} /></button></div>}
        <label className="candidate-select">Makanan yang kamu pilih
          <select value={props.selections[index] ?? ""} onChange={(event) => props.onSelect(index, event.target.value)}>
            <option value="">Belum dipilih</option>
            {props.draft.map((item) => <option key={item.id} value={item.id}>{item.name} · {Math.round(item.grams)} g</option>)}
          </select>
        </label>
        {props.selections[index] && <label className="candidate-select">Nama panggilan untuk lain kali (opsional)<input maxLength={100} value={props.aliases[index] ?? ""} onChange={(event) => props.onAlias(index, event.target.value)} placeholder="Contoh: ayam rumah" /></label>}
        {props.unmatched.includes(index) && <div className="unmatched"><span>Belum ada padanan pasti. Pilih makanan di atas, cari makanan lain, atau abaikan kandidat ini.</span><div><button className="text-button" onClick={props.onSearch}>Cari padanan</button><button className="text-button" onClick={() => props.onIgnore(index)}>Abaikan kandidat</button></div></div>}
        {props.ignored.includes(index) && <small>Kandidat ini tidak dipakai dalam catatan.</small>}
      </div>;
    })}
    {props.analysis.followUpQuestion && <div className="followup"><label htmlFor="followup-answer">{props.analysis.followUpQuestion}</label><input id="followup-answer" value={props.answer} onChange={(event) => props.onAnswer(event.target.value)} placeholder="Contoh: ayamnya digoreng" />{props.photoFile && <button className="text-button" onClick={() => props.onReanalyze(props.photoFile!)} disabled={props.analyzing || !props.answer.trim()}>Analisis ulang dengan jawaban <ArrowRight size={15} /></button>}</div>}
    <label className="review-confirm"><input type="checkbox" checked={props.confirmed} disabled={unresolved || props.unmatched.length > 0} onChange={(event) => props.onConfirm(event.target.checked)} /> Saya sudah memeriksa dan menyesuaikan makanan serta porsinya.</label>
  </div>;
}
