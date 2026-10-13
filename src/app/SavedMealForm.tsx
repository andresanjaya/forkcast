"use client";

import { total, mealTypes, type MealItem, type MealType } from "@/lib/food";
import { Field, FieldLabel } from "@/components/ui/field";
import { mealTypeLabel, tr, useLanguage } from "@/lib/language";

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
export default function SavedMealForm(props: Props) {
  const { language } = useLanguage();
  const number = (value: number | null) => value === null ? "—" : Math.round(value).toLocaleString(language);
  const nutrition = total(props.items);
  return <section className="saved-form" aria-label={props.editing ? tr(language, "Edit kombinasi", "Edit combination") : tr(language, "Simpan kombinasi", "Save combination")}>
    <h3>{props.editing ? tr(language, "Edit kombinasi", "Edit combination") : tr(language, "Simpan kombinasi", "Save combination")}</h3>
    <p className="microcopy">{tr(language, "Periksa item dan porsinya di atas. Perubahan kombinasi tidak mengubah catatan makan lama.", "Check the foods and portions above. Changing this combination does not change older meal logs.")}</p>
    <div className="form-grid">
      <Field><FieldLabel htmlFor="saved-meal-title">{tr(language, "Nama kombinasi", "Combination name")}</FieldLabel><input id="saved-meal-title" maxLength={160} required value={props.title} onChange={(event) => props.onTitle(event.target.value)} placeholder={tr(language, "Contoh: Nasi ayam biasa", "Example: Rice and chicken")} /></Field>
      <Field><FieldLabel htmlFor="saved-meal-category">{tr(language, "Kategori (opsional)", "Category (optional)")}</FieldLabel><select id="saved-meal-category" value={props.category ?? ""} onChange={(event) => props.onCategory(event.target.value ? event.target.value as MealType : null)}><option value="">{tr(language, "Tanpa kategori", "No category")}</option>{mealTypes.map((type) => <option key={type} value={type}>{mealTypeLabel(language, type)}</option>)}</select></Field>
    </div>
    <Field><FieldLabel htmlFor="saved-meal-note">{tr(language, "Catatan (opsional)", "Note (optional)")}</FieldLabel><input id="saved-meal-note" maxLength={300} value={props.note} onChange={(event) => props.onNote(event.target.value)} placeholder={tr(language, "Contoh: Porsi warteg dekat rumah", "Example: My usual lunch portion")} /></Field>
    <div className="saved-form-summary"><strong>{props.items.length} {tr(language, "makanan", "foods")} · {number(nutrition.calories)} {tr(language, "kkal", "kcal")}</strong><span>P {number(nutrition.protein)} · {tr(language, "K", "C")} {number(nutrition.carbs)} · {tr(language, "L", "F")} {number(nutrition.fat)} g</span></div>
    <div className="profile-actions"><button className="primary-button" disabled={props.busy || !props.items.length} onClick={props.onSave}>{props.busy ? tr(language, "Menyimpan...", "Saving...") : props.editing ? tr(language, "Simpan perubahan", "Save changes") : tr(language, "Simpan kombinasi", "Save combination")}</button><button className="outline-button" disabled={props.busy} onClick={props.onCancel}>{tr(language, "Batal", "Cancel")}</button></div>
  </section>;
}
