"use client";

import { useState } from "react";
import { ArrowRight, Bookmark, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { itemAmountLabel, nutrientsFor, type Meal, type MealItem, type SavedMeal } from "@/lib/food";
import { normalizeFoodKey, type FoodShortcut } from "@/lib/meal-memory";
import MealSummaryCard from "@/components/forkcast/MealSummaryCard";
import { tr, useLanguage } from "@/lib/language";

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
function ShortcutCard({ entry, detail, onClick }: { entry: FoodShortcut; detail: string; onClick: () => void }) {
  const { language } = useLanguage();
  const calories = nutrientsFor(entry.item).calories;
  return <Card className="library-food-card memory-food-card"><button type="button" onClick={onClick} aria-label={`${tr(language, "Pilih", "Select")} ${entry.item.name}`}><span className="library-food-copy"><strong>{entry.item.name}</strong><small>{detail} · {calories === null ? "—" : Math.round(calories).toLocaleString(language)} {tr(language, "kkal", "kcal")}</small></span><span className="library-food-add" aria-hidden="true"><Plus size={19} /></span></button></Card>;
}

export default function SavedMealLibrary(props: Props) {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const filtered = props.savedMeals.filter((saved) => normalizeFoodKey(`${saved.title} ${saved.note ?? ""} ${saved.category ?? ""}`).includes(normalizeFoodKey(query)));
  return <div className="saved-panel memory-library">
    <div className="memory-library-head"><div><h3>{tr(language, "Kombinasi tersimpan", "Saved combinations")}</h3><p className="microcopy">{tr(language, "Pakai ulang setelah memeriksa makanan, porsi, dan tanggalnya.", "Reuse after checking food, portions, and date.")}</p></div><button className="outline-button" onClick={props.onCreate}><Plus size={16} /> {tr(language, "Buat baru", "Create new")}</button></div>
    <Field className="search-input memory-search"><FieldLabel className="sr-only" htmlFor="saved-meal-search">{tr(language, "Cari kombinasi tersimpan", "Search saved combinations")}</FieldLabel><Search size={17} /><input id="saved-meal-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr(language, "Cari kombinasi tersimpan", "Search saved combinations")} /></Field>
    {filtered.length ? filtered.map((saved) => <div className="fc-saved-summary" key={saved.id}>
      <MealSummaryCard title={saved.title} time={saved.createdAt ? new Date(saved.createdAt).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" }) : saved.category ?? tr(language, "Kombinasi tersimpan", "Saved combination")} items={saved.items} onClick={() => props.onUseSaved(saved)} />
      {saved.note && <p className="microcopy">{saved.note}</p>}
      <div className="memory-card-actions"><button onClick={() => props.onUseSaved(saved)}><ArrowRight size={15} /> {tr(language, "Pakai", "Use")}</button><button onClick={() => props.onEditSaved(saved)}><Pencil size={15} /> {tr(language, "Edit", "Edit")}</button><Button variant="destructive" size="sm" disabled={props.deletingId === saved.id} onClick={() => props.onDeleteSaved(saved)}><Trash2 size={15} /> {props.deletingId === saved.id ? tr(language, "Menghapus...", "Deleting...") : tr(language, "Hapus", "Delete")}</Button></div>
    </div>) : <p className="empty-inline">{query ? tr(language, "Tidak ada kombinasi yang cocok.", "No matching combinations.") : tr(language, "Belum ada kombinasi tersimpan. Buat dari makanan yang kamu pilih atau dari riwayat.", "No saved combinations yet. Create one from a selected food or your history.")}</p>}

    <h3>{tr(language, "Makanan terakhir", "Recent foods")}</h3>
    {props.recentFoods.length ? <div className="memory-shortcut-list">{props.recentFoods.map((entry) => <ShortcutCard key={entry.key} entry={entry} detail={`${itemAmountLabel(entry.item)} · ${tr(language, "porsi terakhir", "last portion")}`} onClick={() => props.onUseFood(entry.item)} />)}</div> : <p className="empty-inline">{tr(language, "Belum ada makanan terakhir.", "No recent foods yet.")}</p>}
    <h3>{tr(language, "Sering dicatat · 30 hari", "Frequently logged · 30 days")}</h3>
    {props.frequentFoods.length ? <div className="memory-shortcut-list">{props.frequentFoods.map((entry) => <ShortcutCard key={entry.key} entry={entry} detail={`${entry.count} ${tr(language, "kali", "times")} · ${itemAmountLabel(entry.item)}`} onClick={() => props.onUseFood(entry.item)} />)}</div> : <p className="empty-inline">{tr(language, "Belum ada makanan berulang dalam 30 hari terakhir.", "No repeated foods in the past 30 days.")}</p>}
    <h3>{tr(language, "Catatan makan terakhir", "Recent meal logs")}</h3>
    {props.recentMeals.length ? <div className="fc-recent-meal-list">{props.recentMeals.map((meal) => <MealSummaryCard key={meal.id} title={meal.title} time={meal.eatenAt ? new Date(meal.eatenAt).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" }) : meal.date} image={meal.photoPreview} items={meal.items} onClick={() => props.onUseRecentMeal(meal)} />)}</div> : <p className="empty-inline">{tr(language, "Belum ada catatan makan.", "No meal logs yet.")}</p>}
    <p className="microcopy"><Bookmark size={13} /> {tr(language, "Pintasan berasal dari catatanmu sendiri. Memilihnya membuka editor; belum ada yang dicatat otomatis.", "Shortcuts come from your own logs. Selecting one opens the editor; nothing is logged automatically.")}</p>
  </div>;
}
