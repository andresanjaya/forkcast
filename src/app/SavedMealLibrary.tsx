"use client";

import { useState } from "react";
import { ArrowRight, Bookmark, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { itemAmountLabel, nutrientsFor, total, type Meal, type MealItem, type SavedMeal } from "@/lib/food";
import { normalizeFoodKey, type FoodShortcut } from "@/lib/meal-memory";

type Props = {
  savedMeals: SavedMeal[];
  recentMeals: Meal[];
  recentFoods: FoodShortcut[];
  frequentFoods: FoodShortcut[];
  deletingId: string | null;
  onCreate: () => void;
  onUseSaved: (saved: SavedMeal) => void;
  onEditSaved: (saved: SavedMeal) => void;
  onDeleteSaved: (saved: SavedMeal) => void;
  onUseRecentMeal: (meal: Meal) => void;
  onUseFood: (item: MealItem) => void;
};
const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString("id-ID");

function ShortcutCard({ entry, detail, onClick }: { entry: FoodShortcut; detail: string; onClick: () => void }) {
  return <Card className="library-food-card memory-food-card"><button type="button" onClick={onClick} aria-label={`Pilih ${entry.item.name}`}><span className="library-food-copy"><strong>{entry.item.name}</strong><small>{detail} · {number(nutrientsFor(entry.item).calories)} kkal</small></span><span className="library-food-add" aria-hidden="true"><Plus size={19} /></span></button></Card>;
}

export default function SavedMealLibrary(props: Props) {
  const [query, setQuery] = useState("");
  const filtered = props.savedMeals.filter((saved) => normalizeFoodKey(`${saved.title} ${saved.note ?? ""} ${saved.category ?? ""}`).includes(normalizeFoodKey(query)));
  return <div className="saved-panel memory-library">
    <div className="memory-library-head"><div><h3>Kombinasi tersimpan</h3><p className="microcopy">Pakai ulang setelah memeriksa makanan, porsi, dan tanggalnya.</p></div><button className="outline-button" onClick={props.onCreate}><Plus size={16} /> Buat baru</button></div>
    <label className="search-input memory-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kombinasi tersimpan" /></label>
    {filtered.length ? filtered.map((saved) => <Card className="memory-saved-card" key={saved.id}>
      <div><strong>{saved.title}</strong><small>{saved.category ? `${saved.category} · ` : ""}{saved.items.length} makanan · {number(total(saved.items).calories)} kkal</small>{saved.note && <p>{saved.note}</p>}<small>P {number(total(saved.items).protein)} · K {number(total(saved.items).carbs)} · L {number(total(saved.items).fat)} g</small></div>
      <div className="memory-card-actions"><button onClick={() => props.onUseSaved(saved)}><ArrowRight size={15} /> Pakai</button><button onClick={() => props.onEditSaved(saved)}><Pencil size={15} /> Edit</button><button className="danger-text" disabled={props.deletingId === saved.id} onClick={() => props.onDeleteSaved(saved)}><Trash2 size={15} /> {props.deletingId === saved.id ? "Menghapus..." : "Hapus"}</button></div>
    </Card>) : <p className="empty-inline">{query ? "Tidak ada kombinasi yang cocok." : "Belum ada kombinasi tersimpan. Buat dari makanan yang kamu pilih atau dari riwayat."}</p>}

    <h3>Makanan terakhir</h3>
    {props.recentFoods.length ? <div className="memory-shortcut-list">{props.recentFoods.map((entry) => <ShortcutCard key={entry.key} entry={entry} detail={`${itemAmountLabel(entry.item)} · porsi terakhir`} onClick={() => props.onUseFood(entry.item)} />)}</div> : <p className="empty-inline">Belum ada makanan terakhir.</p>}
    <h3>Sering dicatat · 30 hari</h3>
    {props.frequentFoods.length ? <div className="memory-shortcut-list">{props.frequentFoods.map((entry) => <ShortcutCard key={entry.key} entry={entry} detail={`${entry.count} kali · ${itemAmountLabel(entry.item)}`} onClick={() => props.onUseFood(entry.item)} />)}</div> : <p className="empty-inline">Belum ada makanan berulang dalam 30 hari terakhir.</p>}
    <h3>Catatan makan terakhir</h3>
    {props.recentMeals.length ? <div className="memory-shortcut-list">{props.recentMeals.map((meal) => <Card className="library-food-card memory-food-card" key={meal.id}><button type="button" onClick={() => props.onUseRecentMeal(meal)} aria-label={`Pakai lagi ${meal.title}`}><span className="library-food-copy"><strong>{meal.title}</strong><small>{meal.date} · {number(total(meal.items).calories)} kkal</small></span><span className="library-food-add" aria-hidden="true"><ArrowRight size={18} /></span></button></Card>)}</div> : <p className="empty-inline">Belum ada catatan makan.</p>}
    <p className="microcopy"><Bookmark size={13} /> Pintasan berasal dari catatanmu sendiri. Memilihnya membuka editor; belum ada yang dicatat otomatis.</p>
  </div>;
}
