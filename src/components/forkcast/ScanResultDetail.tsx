"use client";

import Image from "next/image";
import { ArrowLeft, Check, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PhotoReview, { type Analysis, type PhotoReviewProps } from "@/app/PhotoReview";
import { mealTypeLabel, tr, useLanguage } from "@/lib/language";

export default function ScanResultDetail({ preview, title, mealType, eatenAt, calories, protein, carbs, fat, review, saveDisabled, saving, onBack, onSave }: {
  preview: string;
  title: string;
  mealType: string;
  eatenAt: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  review: Omit<PhotoReviewProps, "analysis"> & { analysis: Analysis };
  saveDisabled: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}) {
  const { language } = useLanguage();
  const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString(language);
  return <main className="fc-scan-detail-page fc-scan-result-page">
    <div className="fc-scan-detail-hero">
      {preview && <Image src={preview} alt={tr(language, "Foto makanan yang dianalisis", "Analyzed food photo")} fill sizes="100vw" priority unoptimized />}
      {!preview && <div className="fc-scan-detail-placeholder">Forkcast</div>}
      <div className="fc-scan-detail-shade" />
      <Button variant="secondary" size="icon" className="fc-scan-detail-back" aria-label={tr(language, "Kembali ke Home", "Back to Home")} onClick={onBack}><ArrowLeft /></Button>
      <span className="fc-scan-detail-top-title">{tr(language, "Hasil scan", "Scan results")}</span>
    </div>
    <Card className="fc-scan-detail-sheet">
      <div className="fc-scan-detail-scroll">
        <div className="fc-scan-detail-meta"><span>{mealTypeLabel(language, mealType)} · {tr(language, "Estimasi AI", "AI estimate")}</span><span><Clock3 size={14} /> {eatenAt}</span></div>
        <h1>{title}</h1>
        <p className="fc-scan-detail-disclaimer">{tr(language, "Tinjau bahan dan porsinya. Hasil pengenalan AI adalah perkiraan.", "Review the foods and portions. AI recognition results are estimates.")}</p>
        <Card className="fc-scan-calories"><span>{tr(language, "Kalori perkiraan", "Estimated calories")}</span><strong>{number(calories)} <small>{tr(language, "kkal", "kcal")}</small></strong></Card>
        <div className="fc-scan-macros"><Card><small>Protein</small><strong>{number(protein)} g</strong></Card><Card><small>{tr(language, "Karbo", "Carbs")}</small><strong>{number(carbs)} g</strong></Card><Card><small>{tr(language, "Lemak", "Fat")}</small><strong>{number(fat)} g</strong></Card></div>
        <div className="fc-scan-ingredients-heading"><div><h2>{tr(language, "Bahan makanan", "Ingredients")}</h2><p>{tr(language, "Bahan yang terdeteksi dari foto", "Foods detected in the photo")}</p></div><span>{review.analysis.items.length} item</span></div>
        <PhotoReview {...review} />
      </div>
      <footer className="fc-scan-detail-footer"><Button onClick={onSave} disabled={saveDisabled}><Check size={18} /> {saving ? tr(language, "Menyimpan…", "Saving…") : tr(language, "Simpan catatan", "Save log")}</Button></footer>
    </Card>
  </main>;
}
