"use client";
import { ArrowLeft, Bookmark, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FoodPhotoHeader from "./FoodPhotoHeader";
import { itemAmountLabel, nutrientsFor, total, type Meal } from "@/lib/food";
const fmt = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString("id-ID");
export default function MealDetail({ meal, onBack, onRepeat, onSaveCombination, onDelete }: { meal: Meal; onBack: () => void; onRepeat: () => void; onSaveCombination: () => void; onDelete: () => void }) {
  const nutrition = total(meal.items);
  return <main className="fc-detail-page"><header className="fc-page-header"><Button variant="ghost" size="icon" onClick={onBack} aria-label="Kembali"><ArrowLeft /></Button><h1>Detail makanan</h1></header><FoodPhotoHeader name={meal.title} /><Card className="fc-detail-card"><Badge variant="secondary">{meal.type} · Estimasi</Badge><h2>{meal.title}</h2><p>{new Date(`${meal.date}T12:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" })}{meal.eatenAt ? ` · ${new Date(meal.eatenAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}</p><div className="fc-detail-nutrition"><strong>{fmt(nutrition.calories)} <small>kkal</small></strong><span>{fmt(nutrition.protein)} g<small>Protein</small></span><span>{fmt(nutrition.carbs)} g<small>Karbo</small></span><span>{fmt(nutrition.fat)} g<small>Lemak</small></span></div><h3>Komponen makanan</h3>{meal.items.map((item) => <div className="fc-detail-ingredient" key={item.id}><div><strong>{item.name}</strong><small>{itemAmountLabel(item)}</small><small>{item.source}</small></div><span>{fmt(nutrientsFor(item).calories)} kkal</span></div>)}<p className="fc-footnote">Nilai mengikuti porsi dan sumber yang tersimpan dalam catatan.</p><div className="fc-detail-secondary"><Button variant="outline" onClick={onSaveCombination}><Bookmark /> Simpan kombinasi</Button><Button variant="ghost" onClick={onDelete}><Trash2 /> Hapus</Button></div></Card><footer className="fc-detail-footer"><Button onClick={onRepeat}><Plus /> Catat makanan ini lagi</Button></footer></main>;
}
