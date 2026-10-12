"use client";

import Image from "next/image";
import { ArrowLeft, Check, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PhotoReview, { type Analysis, type PhotoReviewProps } from "@/app/PhotoReview";

const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString("id-ID");

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
  return <main className="fc-scan-detail-page">
    <div className="fc-scan-detail-hero">
      {preview && <Image src={preview} alt="Foto makanan yang dianalisis" fill sizes="100vw" priority unoptimized />}
      {!preview && <div className="fc-scan-detail-placeholder">Forkcast</div>}
      <div className="fc-scan-detail-shade" />
      <Button variant="secondary" size="icon" className="fc-scan-detail-back" aria-label="Kembali ke Home" onClick={onBack}><ArrowLeft /></Button>
      <span className="fc-scan-detail-top-title">Hasil scan</span>
    </div>
    <Card className="fc-scan-detail-sheet">
      <div className="fc-scan-detail-scroll">
        <div className="fc-scan-detail-meta"><span>{mealType} · Estimasi AI</span><span><Clock3 size={14} /> {eatenAt}</span></div>
        <h1>{title}</h1>
        <p className="fc-scan-detail-disclaimer">Tinjau bahan dan porsinya. Hasil pengenalan AI adalah perkiraan.</p>
        <Card className="fc-scan-calories"><span>Kalori perkiraan</span><strong>{number(calories)} <small>kkal</small></strong></Card>
        <div className="fc-scan-macros"><Card><small>Protein</small><strong>{number(protein)} g</strong></Card><Card><small>Karbo</small><strong>{number(carbs)} g</strong></Card><Card><small>Lemak</small><strong>{number(fat)} g</strong></Card></div>
        <div className="fc-scan-ingredients-heading"><div><h2>Ingredients</h2><p>Bahan yang terdeteksi dari foto</p></div><span>{review.analysis.items.length} item</span></div>
        <PhotoReview {...review} />
      </div>
      <footer className="fc-scan-detail-footer"><Button onClick={onSave} disabled={saveDisabled}><Check size={18} /> {saving ? "Menyimpan…" : "Simpan catatan"}</Button></footer>
    </Card>
  </main>;
}
