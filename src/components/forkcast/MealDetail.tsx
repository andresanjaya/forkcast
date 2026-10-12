"use client";

import { ArrowLeft, Bookmark, Clock3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FoodPhotoHeader from "./FoodPhotoHeader";
import { itemAmountLabel, nutrientsFor, total, type Meal } from "@/lib/food";

const fmt = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString("id-ID");

export default function MealDetail({ meal, preview, onBack, onRepeat, onSaveCombination, onDelete }: { meal: Meal; preview?: string; onBack: () => void; onRepeat: () => void; onSaveCombination: () => void; onDelete: () => void }) {
  const nutrition = total(meal.items);
  const eatenAt = meal.eatenAt ? new Date(meal.eatenAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : null;

  return <main className="fc-scan-detail-page fc-meal-detail-page">
    <div className="fc-scan-detail-hero fc-meal-detail-hero">
      <FoodPhotoHeader src={preview ?? meal.photoPreview} name={meal.title} />
      <div className="fc-scan-detail-shade" />
      <Button variant="secondary" size="icon" className="fc-scan-detail-back" aria-label="Kembali" onClick={onBack}><ArrowLeft /></Button>
      <span className="fc-scan-detail-top-title">Detail makanan</span>
    </div>
    <Card className="fc-scan-detail-sheet">
      <div className="fc-scan-detail-scroll">
        <div className="fc-scan-detail-meta"><span>{meal.type} · {meal.method === "foto" ? "Ditinjau dari foto" : "Catatan makanan"}</span><span><Clock3 size={14} /> {eatenAt ?? new Date(meal.date + "T12:00:00").toLocaleDateString("id-ID", { dateStyle: "medium" })}</span></div>
        <h1>{meal.title}</h1>
        <p className="fc-scan-detail-disclaimer">Nilai mengikuti porsi dan sumber yang tersimpan dalam catatan.</p>
        <Card className="fc-scan-calories"><span>Kalori</span><strong>{fmt(nutrition.calories)} <small>kkal</small></strong></Card>
        <div className="fc-scan-macros"><Card><small>Protein</small><strong>{fmt(nutrition.protein)} g</strong></Card><Card><small>Karbo</small><strong>{fmt(nutrition.carbs)} g</strong></Card><Card><small>Lemak</small><strong>{fmt(nutrition.fat)} g</strong></Card></div>
        <div className="fc-scan-ingredients-heading"><div><h2>Komponen makanan</h2><p>{new Date(meal.date + "T12:00:00").toLocaleDateString("id-ID", { dateStyle: "long" })}</p></div><span>{meal.items.length} item</span></div>
        <div className="fc-meal-detail-ingredients">{meal.items.map((item) => <Card className="fc-meal-detail-ingredient" key={item.id}><div><strong>{item.name}</strong><small>{itemAmountLabel(item)}</small><small>{item.source}</small></div><span>{fmt(nutrientsFor(item).calories)} kkal</span></Card>)}</div>
        <div className="fc-meal-detail-actions"><Button variant="outline" onClick={onSaveCombination}><Bookmark size={17} /> Simpan kombinasi</Button><Button variant="ghost" onClick={onDelete}><Trash2 size={17} /> Hapus</Button></div>
      </div>
      <footer className="fc-scan-detail-footer"><Button onClick={onRepeat}><Plus size={18} /> Catat makanan ini lagi</Button></footer>
    </Card>
  </main>;
}
