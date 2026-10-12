"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Search } from "lucide-react";
import { changeServing, itemFromFood, libraryFoods, nutrientsFor, searchLibraryFoods, type LibraryFood, type MealItem, type MealType } from "@/lib/food";
import type { FoodShortcut } from "@/lib/meal-memory";

type Props = {
  query: string;
  onQuery: (query: string) => void;
  mealType: MealType;
  onMealType: (type: MealType) => void;
  recent: FoodShortcut[];
  frequent: FoodShortcut[];
  signedIn: boolean;
  onAdd: (item: MealItem) => void;
};
type Selection = { item: MealItem; food: LibraryFood | null };
const number = (value: number | null) => value === null ? "—" : value.toLocaleString("id-ID", { maximumFractionDigits: 1 });

export default function FoodLibrary(props: Props) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLHeadingElement>(null);
  const results = searchLibraryFoods(props.query);
  const selectedId = selected?.item.id;

  useEffect(() => { if (selectedId) detailRef.current?.focus(); }, [selectedId]);

  function openFood(food: LibraryFood) { setSelected({ food, item: itemFromFood(food) }); }
  function openRecent(entry: FoodShortcut) {
    const item = { ...entry.item, id: crypto.randomUUID(), per100g: { ...entry.item.per100g } };
    setSelected({ item, food: libraryFoods.find((food) => food.id === item.foodId) ?? null });
  }
  function back() { setSelected(null); window.requestAnimationFrame(() => searchRef.current?.focus()); }

  if (selected) {
    const { item, food } = selected;
    const units = food?.servings ?? [{ unit: item.unit, grams: item.gramsPerUnit }];
    const availableUnits = units.some((serving) => serving.unit === "gram") ? units : [...units, { unit: "gram", grams: 1 }];
    const currentUnit = availableUnits.find((serving) => serving.unit === item.unit);
    const valid = Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.grams) && item.grams > 0 && item.grams <= 10000
      && Object.values(item.per100g).every((value) => Number.isFinite(value) && value >= 0);
    const nutrition = valid ? nutrientsFor(item) : null;
    return <section className="food-library panel" aria-label="Detail makanan">
      <button className="text-button library-back" type="button" onClick={back}><ArrowLeft size={16} /> Kembali ke hasil</button>
      <span className="card-kicker">{food?.category ?? "CATATANMU"}</span>
      <h3 ref={detailRef} tabIndex={-1}>{item.name}</h3>
      <p className="library-source-status">{food ? food.dataStatus === "padanan" ? "Padanan dari data sumber" : "Data dari sumber" : "Dari catatanmu sebelumnya"} · Estimasi per 100 g</p>
      <div className="library-serving-grid">
        <label className="field">Satuan<select value={item.unit} onChange={(event) => setSelected({ ...selected, item: changeServing(item, event.target.value) })}>{availableUnits.map((serving) => <option key={serving.unit} value={serving.unit}>{serving.unit}{serving.unit === "gram" ? "" : ` · ${serving.approximate ? "±" : ""}${number(serving.grams)} g`}</option>)}</select></label>
        <label className="field">Jumlah<input type="number" min="0.1" max={item.unit === "gram" ? 10000 : 10000 / item.gramsPerUnit} step="0.1" value={Number.isFinite(item.quantity) ? item.quantity : ""} onChange={(event) => { const quantity = Number(event.target.value); setSelected({ ...selected, item: { ...item, quantity, grams: quantity * item.gramsPerUnit, corrected: true } }); }} /></label>
      </div>
      <p className="library-grams">{valid ? `${number(item.grams)} g` : "Periksa jumlah dan satuan."}{currentUnit?.approximate && " · Ukuran rumah tangga perkiraan"}</p>
      <div className="library-nutrition" aria-live="polite"><strong>{nutrition ? `${number(nutrition.calories)} kkal` : "—"}</strong><span>Protein {nutrition ? number(nutrition.protein) : "—"} g</span><span>Karbo {nutrition ? number(nutrition.carbs) : "—"} g</span><span>Lemak {nutrition ? number(nutrition.fat) : "—"} g</span></div>
      <div className="library-provenance"><strong>Sumber perkiraan</strong><p>{item.source}</p>{food && <><p>{food.sourceVersion} · {food.preparationNote}</p><a href={food.sourceReference} target="_blank" rel="noopener noreferrer">Lihat sumber USDA <ArrowRight size={14} /></a>{food.sourceAdditionalReference && <a href={food.sourceAdditionalReference} target="_blank" rel="noopener noreferrer">Lihat sumber bahan kedua USDA <ArrowRight size={14} /></a>}</>}{!food && <p>Nilai ini memakai snapshot dari catatanmu. Periksa kembali jika resep atau merek berubah.</p>}<small>Nilai dapat berubah menurut bahan, cara memasak, dan ukuran porsi. Bukan angka pasti untuk semua hidangan.</small></div>
      <label className="field library-meal-type">Masukkan ke<select value={props.mealType} onChange={(event) => props.onMealType(event.target.value as MealType)}><option>Sarapan</option><option>Makan siang</option><option>Makan malam</option><option>Camilan</option></select></label>
      <button className="primary-button library-add" type="button" disabled={!valid} onClick={() => { props.onAdd(item); setSelected(null); }}><Plus size={16} /> Tambahkan ke catatan</button>
    </section>;
  }

  return <section className="food-library panel" aria-label="Katalog makanan Indonesia">
    <span className="card-kicker">KATALOG AWAL</span><h3>Cari makanan Indonesia</h3>
    <p className="microcopy">Katalog kecil ini tersedia tanpa koneksi. Makanan olahan dan porsi dapat berbeda dari data sumber.</p>
    <label className="food-search-input"><Search size={18} /><span className="sr-only">Cari nama makanan atau nama lain</span><input ref={searchRef} type="search" value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Cari nasi, tempe, pepaya..." autoComplete="off" /></label>
    <p className="library-result-count" role="status">{props.query.trim() ? `${results.length} makanan ditemukan` : `${libraryFoods.length} makanan dalam katalog awal`}</p>
    {!props.query.trim() && <div className="library-shortcuts">
      <h4>Terakhir dicatat</h4>{props.signedIn ? props.recent.some((entry) => !entry.item.packaged) ? props.recent.filter((entry) => !entry.item.packaged).slice(0, 4).map((entry) => <button type="button" key={entry.key} onClick={() => openRecent(entry)}>{entry.item.name}<small>{number(entry.item.grams)} g terakhir</small></button>) : <p>Belum ada catatan makanan akun.</p> : <p>Masuk ke akun untuk melihat makanan yang terakhir dicatat.</p>}
      {props.signedIn && props.frequent.some((entry) => !entry.item.packaged) && <><h4>Sering dicatat · 30 hari</h4>{props.frequent.filter((entry) => !entry.item.packaged).slice(0, 4).map((entry) => <button type="button" key={entry.key} onClick={() => openRecent(entry)}>{entry.item.name}<small>{entry.count} kali</small></button>)}</>}
    </div>}
    {results.length ? <div className="library-results">{results.map((food) => <button type="button" key={food.id} onClick={() => openFood(food)}><span><strong>{food.name}</strong><small>{food.category} · Estimasi bersumber</small></span><ArrowRight size={17} /></button>)}</div> : <div className="library-empty"><strong>Belum ada yang cocok</strong><p>Coba nama lain atau catat makanan sendiri lewat pencarian manual.</p></div>}
  </section>;
}
