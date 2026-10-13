"use client";

import FoodPhotoHeader from "@/components/forkcast/FoodPhotoHeader";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { mealTypeLabel, tr, useLanguage } from "@/lib/language";
import { changeServing, itemFromFood, nutrientsFor, searchLibraryFoods, type LibraryFood, type MealItem, type MealType } from "@/lib/food";

type Props = {
  query: string;
  onQuery: (query: string) => void;
  mealType: MealType;
  onMealType: (type: MealType) => void;
  onAdd: (item: MealItem) => void;
};
type Selection = { item: MealItem; food: LibraryFood | null };

export default function FoodLibrary(props: Props) {
  const { language } = useLanguage();
  const number = (value: number | null) => value === null ? "—" : value.toLocaleString(language, { maximumFractionDigits: 1 });
  const [selected, setSelected] = useState<Selection | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLHeadingElement>(null);
  const results = searchLibraryFoods(props.query);
  const selectedId = selected?.item.id;

  useEffect(() => { if (selectedId) detailRef.current?.focus(); }, [selectedId]);

  function openFood(food: LibraryFood) { setSelected({ food, item: itemFromFood(food) }); }
  function back() { setSelected(null); window.requestAnimationFrame(() => searchRef.current?.focus()); }

  if (selected) {
    const { item, food } = selected;
    const units = food?.servings ?? [{ unit: item.unit, grams: item.gramsPerUnit }];
    const availableUnits = units.some((serving) => serving.unit === "gram") ? units : [...units, { unit: "gram", grams: 1 }];
    const currentUnit = availableUnits.find((serving) => serving.unit === item.unit);
    const valid = Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.grams) && item.grams > 0 && item.grams <= 10000
      && Object.values(item.per100g).every((value) => Number.isFinite(value) && value >= 0);
    const nutrition = valid ? nutrientsFor(item) : null;
    return <section className="food-library" aria-label={tr(language, "Detail makanan", "Food details")}>
      <button className="text-button library-back" type="button" onClick={back}><ArrowLeft size={16} /> {tr(language, "Kembali ke hasil", "Back to results")}</button>
      <FoodPhotoHeader name={item.name} /><span className="card-kicker">{food?.category ?? tr(language, "CATATANMU", "YOUR LOG")}</span>
      <h3 ref={detailRef} tabIndex={-1}>{item.name}</h3>
      <p className="library-source-status">{food ? food.dataStatus === "padanan" ? tr(language, "Padanan dari data sumber", "Matched to source data") : tr(language, "Data dari sumber", "Source data") : tr(language, "Dari catatanmu sebelumnya", "From your previous logs")} · {tr(language, "Estimasi per 100 g", "Estimate per 100 g")}</p>
      <div className="library-serving-grid">
        <Field><FieldLabel htmlFor="library-unit">{tr(language, "Satuan", "Unit")}</FieldLabel><select id="library-unit" value={item.unit} onChange={(event) => setSelected({ ...selected, item: changeServing(item, event.target.value) })}>{availableUnits.map((serving) => <option key={serving.unit} value={serving.unit}>{serving.unit}{serving.unit === "gram" ? "" : ` · ${serving.approximate ? "±" : ""}${number(serving.grams)} g`}</option>)}</select></Field>
        <Field><FieldLabel htmlFor="library-quantity">{tr(language, "Jumlah", "Quantity")}</FieldLabel><input id="library-quantity" type="number" min="0.1" max={item.unit === "gram" ? 10000 : 10000 / item.gramsPerUnit} step="0.1" value={Number.isFinite(item.quantity) ? item.quantity : ""} onChange={(event) => { const quantity = Number(event.target.value); setSelected({ ...selected, item: { ...item, quantity, grams: quantity * item.gramsPerUnit, corrected: true } }); }} /></Field>
      </div>
      <p className="library-grams">{valid ? `${number(item.grams)} g` : tr(language, "Periksa jumlah dan satuan.", "Check the quantity and unit.")}{currentUnit?.approximate && ` · ${tr(language, "Ukuran rumah tangga perkiraan", "Approximate household measure")}`}</p>
      <div className="library-nutrition" aria-live="polite"><strong>{nutrition ? `${number(nutrition.calories)} ${tr(language, "kkal", "kcal")}` : "—"}</strong><span>Protein {nutrition ? number(nutrition.protein) : "—"} g</span><span>{tr(language, "Karbo", "Carbs")} {nutrition ? number(nutrition.carbs) : "—"} g</span><span>{tr(language, "Lemak", "Fat")} {nutrition ? number(nutrition.fat) : "—"} g</span></div>
      <div className="library-provenance"><strong>{tr(language, "Sumber perkiraan", "Estimate source")}</strong><p>{item.source}</p>{food && <><p>{food.sourceVersion} · {food.preparationNote}</p><a href={food.sourceReference} target="_blank" rel="noopener noreferrer">{tr(language, "Lihat sumber USDA", "View USDA source")} <ArrowRight size={14} /></a>{food.sourceAdditionalReference && <a href={food.sourceAdditionalReference} target="_blank" rel="noopener noreferrer">{tr(language, "Lihat sumber bahan kedua USDA", "View second USDA ingredient source")} <ArrowRight size={14} /></a>}</>}{!food && <p>{tr(language, "Nilai ini memakai snapshot dari catatanmu. Periksa kembali jika resep atau merek berubah.", "These values come from a saved snapshot. Check again if the recipe or brand changes.")}</p>}<small>{tr(language, "Nilai dapat berubah menurut bahan, cara memasak, dan ukuran porsi. Bukan angka pasti untuk semua hidangan.", "Values vary by ingredients, cooking method, and portion size. They are not exact for every dish.")}</small></div>
      <Field className="library-meal-type"><FieldLabel htmlFor="library-meal-type">{tr(language, "Masukkan ke", "Add to")}</FieldLabel><select id="library-meal-type" value={props.mealType} onChange={(event) => props.onMealType(event.target.value as MealType)}>{(["Sarapan", "Makan siang", "Makan malam", "Camilan"] as MealType[]).map((type) => <option key={type} value={type}>{mealTypeLabel(language, type)}</option>)}</select></Field>
      <button className="primary-button library-add" type="button" disabled={!valid} onClick={() => { props.onAdd(item); setSelected(null); }}><Plus size={16} /> {tr(language, "Tambahkan ke catatan", "Add to log")}</button>
    </section>;
  }

  return <section className="food-library" aria-label={tr(language, "Katalog makanan Indonesia", "Food catalog")}>
    <Field className="food-search-input"><FieldLabel className="sr-only" htmlFor="library-search">{tr(language, "Cari nama makanan atau nama lain", "Search food names")}</FieldLabel><Search size={18} /><input id="library-search" ref={searchRef} type="search" value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder={tr(language, "Cari nasi, tempe, pepaya...", "Search rice, tempeh, papaya...")} autoComplete="off" /></Field>
    <div className="library-list-heading"><h3>{props.query.trim() ? tr(language, "Hasil pencarian", "Search results") : tr(language, "Saran makanan", "Suggested foods")}</h3><span role="status">{results.length}</span></div>
    {results.length ? <div className="library-results">{results.map((food) => {
      const serving = food.servings[0];
      const servingLabel = serving ? `${serving.approximate ? "≈ " : ""}${serving.unit} · ${number(serving.grams)} g` : "100 g";
      const calories = serving ? food.per100g.calories * serving.grams / 100 : food.per100g.calories;
      return <Card className="library-food-card" key={food.id}><button type="button" onClick={() => openFood(food)} aria-label={`${tr(language, "Pilih", "Select")} ${food.name}`}><span className="library-food-copy"><strong>{food.name}</strong><small>{number(calories)} {tr(language, "kkal", "kcal")} · {servingLabel}</small></span><span className="library-food-add" aria-hidden="true"><Plus size={19} /></span></button></Card>;
    })}</div> : <div className="library-empty"><strong>{tr(language, "Belum ada yang cocok", "No matches yet")}</strong><p>{tr(language, "Coba nama lain atau pilih Input manual.", "Try another name or choose Manual entry.")}</p></div>}
  </section>;
}
