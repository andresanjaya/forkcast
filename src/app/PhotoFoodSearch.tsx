"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { itemFromFood, searchPhotoFoods, type Food, type MealItem } from "@/lib/food";

type Props = { candidateName?: string; estimatedGrams?: number; manualFirst?: boolean; onFood: (item: MealItem) => void; onClose: () => void };
type NutrientKey = "calories" | "protein" | "carbs" | "fat";
const nutrientLabels: Record<NutrientKey, string> = { calories: "Kalori", protein: "Protein (g)", carbs: "Karbo (g)", fat: "Lemak (g)" };

export default function PhotoFoodSearch({ candidateName = "", estimatedGrams = 100, manualFirst = false, onFood, onClose }: Props) {
  const [query, setQuery] = useState(candidateName);
  const [manualOpen, setManualOpen] = useState(manualFirst);
  const [name, setName] = useState(candidateName);
  const [grams, setGrams] = useState(String(estimatedGrams));
  const [values, setValues] = useState<Record<NutrientKey, string>>({ calories: "", protein: "", carbs: "", fat: "" });
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
      setError("Isi nama, porsi, dan semua nilai gizi per 100 g dengan angka yang valid.");
      return;
    }
    onFood({ id: crypto.randomUUID(), foodId: null, name: name.trim(), quantity: amount, unit: "gram", gramsPerUnit: 1, grams: amount, per100g: nutrients, source: "Diisi pengguna dari tinjau foto", corrected: true });
  }

  return <div className="candidate-search">
    <div className="candidate-search-head"><strong>{candidateName ? `Cari padanan untuk ${candidateName}` : "Tambah makanan yang terlewat"}</strong><button type="button" className="text-button" onClick={onClose}>Tutup</button></div>
    {manualOpen ? <div className="candidate-manual">
      <p>Isi nilai gizi per 100 g dari label atau sumber yang kamu percaya.</p>
      <label className="field">Nama makanan<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field">Porsi yang dimakan (g)<input type="number" min="1" max="10000" value={grams} onChange={(event) => setGrams(event.target.value)} /></label>
      <div className="custom-grid">{(Object.keys(nutrientLabels) as NutrientKey[]).map((key) => <label className="field" key={key}>{nutrientLabels[key]}<input type="number" min="0" step="any" value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}</div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="candidate-actions"><button type="button" className="outline-button" onClick={() => setManualOpen(false)}>Kembali ke hasil</button><button type="button" className="primary-button" onClick={addManual}>Tambahkan makanan</button></div>
    </div> : <>
      <label className="food-search-input"><Search size={18} /><span className="sr-only">Kata kunci makanan</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ubah kata kunci, misalnya timun segar" autoComplete="off" /></label>
      <div className="candidate-search-results">{results.map((food) => <button type="button" key={food.id} onClick={() => choose(food)}><span><strong>{food.name}</strong><small>{food.category} · {food.source}</small></span><Plus size={17} /></button>)}</div>
      {results.length === 0 && <p className="candidate-search-empty">Padanan belum ditemukan. Coba kata lain atau tambahkan sebagai makanan manual.</p>}
      <button type="button" className="outline-button candidate-manual-button" onClick={() => { setName(query.trim() || candidateName); setManualOpen(true); }}>Input makanan manual</button>
    </>}
  </div>;
}
