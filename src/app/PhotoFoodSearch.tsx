"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { itemFromFood, searchPhotoFoods, type Food, type MealItem } from "@/lib/food";
import { tr, useLanguage } from "@/lib/language";

type Props = { candidateName?: string; estimatedGrams?: number; estimatedNutritionPer100g?: { calories: number; protein: number; carbs: number; fat: number }; nutritionConfidence?: "low" | "medium" | "high"; manualFirst?: boolean; onFood: (item: MealItem) => void; onClose: () => void };
type NutrientKey = "calories" | "protein" | "carbs" | "fat";
const nutrientLabels: Record<NutrientKey, string> = { calories: "Kalori", protein: "Protein (g)", carbs: "Karbo (g)", fat: "Lemak (g)" };

export default function PhotoFoodSearch({ candidateName = "", estimatedGrams = 100, estimatedNutritionPer100g, nutritionConfidence, manualFirst = false, onFood, onClose }: Props) {
  const { language } = useLanguage();
  const [query, setQuery] = useState(candidateName);
  const [manualOpen, setManualOpen] = useState(manualFirst);
  const [name, setName] = useState(candidateName);
  const [grams, setGrams] = useState(String(estimatedGrams));
  const [values, setValues] = useState<Record<NutrientKey, string>>(() => estimatedNutritionPer100g ? { calories: String(estimatedNutritionPer100g.calories), protein: String(estimatedNutritionPer100g.protein), carbs: String(estimatedNutritionPer100g.carbs), fat: String(estimatedNutritionPer100g.fat) } : { calories: "", protein: "", carbs: "", fat: "" });
  const [error, setError] = useState("");
  const results = searchPhotoFoods(query);

  function choose(food: Food) {
    const item = itemFromFood(food);
    if (candidateName) {
      Object.assign(item, { unit: "gram", quantity: estimatedGrams, gramsPerUnit: 1, grams: estimatedGrams, corrected: true });
    }
    onFood(item);
  }

  function addManual() {
    const amount = Number(grams);
    const nutrients = Object.fromEntries((Object.keys(nutrientLabels) as NutrientKey[]).map((key) => [key, Number(values[key])])) as Record<NutrientKey, number>;
    if (!name.trim() || !grams.trim() || !Number.isFinite(amount) || amount <= 0 || amount > 10000 || (Object.keys(nutrientLabels) as NutrientKey[]).some((key) => !values[key].trim() || !Number.isFinite(nutrients[key]) || nutrients[key] < 0)) {
      setError(tr(language, "Isi nama, porsi, dan semua nilai gizi per 100 g dengan angka yang valid.", "Enter a name, portion, and all nutrition values per 100 g using valid numbers."));
      return;
    }
    onFood({ id: crypto.randomUUID(), foodId: null, name: name.trim(), quantity: amount, unit: "gram", gramsPerUnit: 1, grams: amount, per100g: nutrients, source: estimatedNutritionPer100g ? tr(language, "Saran gizi AI dari foto; diperiksa pengguna", "AI nutrition suggestion from photo; reviewed by user") : tr(language, "Diisi pengguna dari tinjau foto", "Entered by user from photo review"), corrected: true });
  }

  return <div className="candidate-search">
    <div className="candidate-search-head"><strong>{candidateName ? `${tr(language, "Cari padanan untuk", "Find a match for")} ${candidateName}` : tr(language, "Tambah makanan yang terlewat", "Add a missing food")}</strong><button type="button" className="text-button" onClick={onClose}>{tr(language, "Tutup", "Close")}</button></div>
    {manualOpen ? <div className="candidate-manual">
      <p>{tr(language, "Nilai gizi per 100 g. Saran AI dari foto adalah perkiraan dan bisa kamu ubah.", "Nutrition values per 100 g. AI photo suggestions are estimates that you can edit.")}</p>{estimatedNutritionPer100g && <p className="microcopy">{tr(language, "Keyakinan saran AI", "AI suggestion confidence")}: {nutritionConfidence === "high" ? tr(language, "tinggi", "high") : nutritionConfidence === "low" ? tr(language, "rendah", "low") : tr(language, "sedang", "medium")}.</p>}
      <Field><FieldLabel htmlFor="photo-food-name">{tr(language, "Nama makanan", "Food name")}</FieldLabel><input id="photo-food-name" aria-invalid={Boolean(error)} aria-describedby={error ? "photo-food-error" : undefined} value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field><FieldLabel htmlFor="photo-food-grams">{tr(language, "Porsi yang dimakan (g)", "Portion eaten (g)")}</FieldLabel><input id="photo-food-grams" type="number" min="1" max="10000" aria-invalid={Boolean(error)} aria-describedby={error ? "photo-food-error" : undefined} value={grams} onChange={(event) => setGrams(event.target.value)} /></Field>
      <div className="custom-grid">{(Object.keys(nutrientLabels) as NutrientKey[]).map((key) => <Field key={key}><FieldLabel htmlFor={`photo-food-${key}`}>{language === "en-US" ? { calories: "Calories", protein: "Protein (g)", carbs: "Carbs (g)", fat: "Fat (g)" }[key] : nutrientLabels[key]}</FieldLabel><input id={`photo-food-${key}`} type="number" min="0" step="any" aria-invalid={Boolean(error)} aria-describedby={error ? "photo-food-error" : undefined} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></Field>)}</div>
      {error && <FieldError id="photo-food-error">{error}</FieldError>}
      <div className="candidate-actions"><button type="button" className="outline-button" onClick={() => setManualOpen(false)}>{tr(language, "Kembali ke hasil", "Back to results")}</button><button type="button" className="primary-button" onClick={addManual}>{tr(language, "Tambahkan makanan", "Add food")}</button></div>
    </div> : <>
      <Field className="food-search-input"><FieldLabel className="sr-only" htmlFor="photo-food-search">{tr(language, "Kata kunci makanan", "Food search terms")}</FieldLabel><Search size={18} /><input id="photo-food-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr(language, "Ubah kata kunci, misalnya timun segar", "Try a different term, such as fresh cucumber")} autoComplete="off" /></Field>
      <div className="candidate-search-results">{results.map((food) => <button type="button" key={food.id} onClick={() => choose(food)}><span><strong>{food.name}</strong><small>{food.category} · {food.source}</small></span><Plus size={17} /></button>)}</div>
      {results.length === 0 && <p className="candidate-search-empty">{tr(language, "Padanan belum ditemukan. Coba kata lain atau tambahkan sebagai makanan manual.", "No match found. Try another term or add it as a manual food.")}</p>}
      <button type="button" className="outline-button candidate-manual-button" onClick={() => { setName(query.trim() || candidateName); setManualOpen(true); }}>{tr(language, "Input makanan manual", "Manual food entry")}</button>
    </>}
  </div>;
}
