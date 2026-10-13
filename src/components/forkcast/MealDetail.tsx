"use client";

import { ArrowLeft, Bookmark, Clock3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FoodPhotoHeader from "./FoodPhotoHeader";
import { itemAmountLabel, nutrientsFor, total, type Meal } from "@/lib/food";
import { mealTypeLabel, tr, useLanguage } from "@/lib/language";

export default function MealDetail({ meal, preview, onBack, onRepeat, onSaveCombination, onDelete }: { meal: Meal; preview?: string; onBack: () => void; onRepeat: () => void; onSaveCombination: () => void; onDelete: () => void }) {
  const { language } = useLanguage();
  const fmt = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString(language);
  const nutrition = total(meal.items);
  const eatenAt = meal.eatenAt ? new Date(meal.eatenAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" }) : null;

  return <main className="fc-scan-detail-page fc-meal-detail-page">
    <div className="fc-scan-detail-hero fc-meal-detail-hero">
      <FoodPhotoHeader src={meal.photoPreview ?? preview} name={meal.title} />
      <div className="fc-scan-detail-shade" />
      <Button variant="secondary" size="icon" className="fc-scan-detail-back" aria-label={tr(language, "Kembali", "Back")} onClick={onBack}><ArrowLeft /></Button>
      <span className="fc-scan-detail-top-title">{tr(language, "Detail makanan", "Food details")}</span>
    </div>
    <Card className="fc-scan-detail-sheet">
      <div className="fc-scan-detail-scroll">
        <div className="fc-scan-detail-meta"><span>{mealTypeLabel(language, meal.type)} · {meal.method === "foto" ? tr(language, "Ditinjau dari foto", "Reviewed from photo") : tr(language, "Catatan makanan", "Food log")}</span><span><Clock3 size={14} /> {eatenAt ?? new Date(meal.date + "T12:00:00").toLocaleDateString(language, { dateStyle: "medium" })}</span></div>
        <h1>{meal.title}</h1>
        <p className="fc-scan-detail-disclaimer">{tr(language, "Nilai mengikuti porsi dan sumber yang tersimpan dalam catatan.", "Values follow the saved serving sizes and sources.")}</p>
        <Card className="fc-scan-calories"><span>{tr(language, "Kalori", "Calories")}</span><strong>{fmt(nutrition.calories)} <small>{tr(language, "kkal", "kcal")}</small></strong></Card>
        <div className="fc-scan-macros"><Card><small>Protein</small><strong>{fmt(nutrition.protein)} g</strong></Card><Card><small>{tr(language, "Karbo", "Carbs")}</small><strong>{fmt(nutrition.carbs)} g</strong></Card><Card><small>{tr(language, "Lemak", "Fat")}</small><strong>{fmt(nutrition.fat)} g</strong></Card></div>
        <div className="fc-scan-ingredients-heading"><div><h2>{tr(language, "Komponen makanan", "Food components")}</h2><p>{new Date(meal.date + "T12:00:00").toLocaleDateString(language, { dateStyle: "long" })}</p></div><span>{meal.items.length} {tr(language, "item", "items")}</span></div>
        <div className="fc-meal-detail-ingredients">{meal.items.map((item) => <Card className="fc-meal-detail-ingredient" key={item.id}><div><strong>{item.name}</strong><small>{itemAmountLabel(item)}</small><small>{item.source}</small></div><span>{fmt(nutrientsFor(item).calories)} {tr(language, "kkal", "kcal")}</span></Card>)}</div>
        <div className="fc-meal-detail-actions"><Button variant="outline" onClick={onSaveCombination}><Bookmark size={17} /> {tr(language, "Simpan kombinasi", "Save combination")}</Button><Button variant="destructive" onClick={onDelete}><Trash2 size={17} /> {tr(language, "Hapus", "Delete")}</Button></div>
      </div>
      <footer className="fc-scan-detail-footer"><Button onClick={onRepeat}><Plus size={18} /> {tr(language, "Catat makanan ini lagi", "Log this meal again")}</Button></footer>
    </Card>
  </main>;
}
