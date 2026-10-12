"use client";

import { total, mealTypes, type MealItem, type MealType } from "@/lib/food";

type Props = {
  editing: boolean;
  title: string;
  note: string;
  category: MealType | null;
  items: MealItem[];
  busy: boolean;
  onTitle: (value: string) => void;
  onNote: (value: string) => void;
  onCategory: (value: MealType | null) => void;
  onSave: () => void;
  onCancel: () => void;
};
const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString("id-ID");

export default function SavedMealForm(props: Props) {
  const nutrition = total(props.items);
  return <section className="saved-form" aria-label={props.editing ? "Edit kombinasi" : "Simpan kombinasi"}>
    <h3>{props.editing ? "Edit kombinasi" : "Simpan kombinasi"}</h3>
    <p className="microcopy">Periksa item dan porsinya di atas. Perubahan kombinasi tidak mengubah catatan makan lama.</p>
    <div className="form-grid">
      <label className="field">Nama kombinasi<input maxLength={160} required value={props.title} onChange={(event) => props.onTitle(event.target.value)} placeholder="Contoh: Nasi ayam biasa" /></label>
      <label className="field">Kategori (opsional)<select value={props.category ?? ""} onChange={(event) => props.onCategory(event.target.value ? event.target.value as MealType : null)}><option value="">Tanpa kategori</option>{mealTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
    </div>
    <label className="field">Catatan (opsional)<input maxLength={300} value={props.note} onChange={(event) => props.onNote(event.target.value)} placeholder="Contoh: Porsi warteg dekat rumah" /></label>
    <div className="saved-form-summary"><strong>{props.items.length} makanan · {number(nutrition.calories)} kkal</strong><span>P {number(nutrition.protein)} · K {number(nutrition.carbs)} · L {number(nutrition.fat)} g</span></div>
    <div className="profile-actions"><button className="primary-button" disabled={props.busy || !props.items.length} onClick={props.onSave}>{props.busy ? "Menyimpan..." : props.editing ? "Simpan perubahan" : "Simpan kombinasi"}</button><button className="outline-button" disabled={props.busy} onClick={props.onCancel}>Batal</button></div>
  </section>;
}
