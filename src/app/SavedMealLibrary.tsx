"use client";

import { useState } from "react";
import { ArrowRight, Bookmark, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { total, type Meal, type MealItem, type SavedMeal } from "@/lib/food";
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
const number = (value: number) => Math.round(value).toLocaleString("id-ID");

export default function SavedMealLibrary(props: Props) {
  const [query, setQuery] = useState("");
  const filtered = props.savedMeals.filter((saved) => normalizeFoodKey(`${saved.title} ${saved.note ?? ""} ${saved.category ?? ""}`).includes(normalizeFoodKey(query)));
  return <div className="saved-panel memory-library">
    <div className="memory-library-head"><div><h3>Kombinasi tersimpan</h3><p className="microcopy">Pakai ulang setelah memeriksa makanan, porsi, dan tanggalnya.</p></div><button className="outline-button" onClick={props.onCreate}><Plus size={16} /> Buat baru</button></div>
    <label className="search-input memory-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kombinasi tersimpan" /></label>
    {filtered.length ? filtered.map((saved) => <div className="memory-saved-card" key={saved.id}>
      <div><strong>{saved.title}</strong><small>{saved.category ? `${saved.category} · ` : ""}{saved.items.length} makanan · {number(total(saved.items).calories)} kkal</small>{saved.note && <p>{saved.note}</p>}<small>P {number(total(saved.items).protein)} · K {number(total(saved.items).carbs)} · L {number(total(saved.items).fat)} g</small></div>
      <div className="memory-card-actions"><button onClick={() => props.onUseSaved(saved)}><ArrowRight size={15} /> Pakai</button><button onClick={() => props.onEditSaved(saved)}><Pencil size={15} /> Edit</button><button className="danger-text" disabled={props.deletingId === saved.id} onClick={() => props.onDeleteSaved(saved)}><Trash2 size={15} /> {props.deletingId === saved.id ? "Menghapus..." : "Hapus"}</button></div>
    </div>) : <p className="empty-inline">{query ? "Tidak ada kombinasi yang cocok." : "Belum ada kombinasi tersimpan. Buat dari makanan yang kamu pilih atau dari riwayat."}</p>}

    <h3>Makanan terakhir</h3>
    {props.recentFoods.length ? <div className="memory-shortcut-list">{props.recentFoods.map((entry) => <button key={entry.key} onClick={() => props.onUseFood(entry.item)}><span><strong>{entry.item.name}</strong><small>{number(entry.item.grams)} g · porsi terakhir</small></span><Plus size={16} /></button>)}</div> : <p className="empty-inline">Belum ada makanan terakhir.</p>}
    <h3>Sering dicatat · 30 hari</h3>
    {props.frequentFoods.length ? <div className="memory-shortcut-list">{props.frequentFoods.map((entry) => <button key={entry.key} onClick={() => props.onUseFood(entry.item)}><span><strong>{entry.item.name}</strong><small>{entry.count} kali · porsi terakhir {number(entry.item.grams)} g</small></span><Plus size={16} /></button>)}</div> : <p className="empty-inline">Belum ada makanan berulang dalam 30 hari terakhir.</p>}
    <h3>Catatan makan terakhir</h3>
    {props.recentMeals.length ? props.recentMeals.map((meal) => <button className="saved-row" key={meal.id} onClick={() => props.onUseRecentMeal(meal)}><span><strong>{meal.title}</strong><small>{meal.date} · {number(total(meal.items).calories)} kkal</small></span><ArrowRight size={17} /></button>) : <p className="empty-inline">Belum ada catatan makan.</p>}
    <p className="microcopy"><Bookmark size={13} /> Pintasan berasal dari catatanmu sendiri. Memilihnya membuka editor; belum ada yang dicatat otomatis.</p>
  </div>;
}
