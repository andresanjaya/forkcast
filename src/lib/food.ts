export type Nutrients = { calories: number; protein: number; carbs: number; fat: number };
export type Food = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  state: "matang" | "olahan";
  per100g: Nutrients;
  servings: { unit: string; grams: number }[];
  source: string;
  sourceDate: string;
  quality: "contoh" | "terverifikasi";
};
export type MealType = "Sarapan" | "Makan siang" | "Makan malam" | "Camilan";
export type MealItem = {
  id: string;
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  gramsPerUnit: number;
  grams: number;
  per100g: Nutrients;
  source: string;
  corrected: boolean;
};
export type Meal = { id: string; date: string; eatenAt?: string; type: MealType; title: string; method: "manual" | "foto" | "tersimpan"; items: MealItem[]; createdAt: string };
export type SavedMeal = { id: string; title: string; items: MealItem[] };
export type WeightEntry = { id: string; date: string; weight: number };
export type Profile = {
  name: string;
  age: number;
  height: number;
  weight: number;
  sex: "pria" | "wanita";
  activity: "rendah" | "ringan" | "sedang" | "tinggi";
  goal: "turun" | "jaga" | "naik";
  calorieTarget: number;
};

// These are intentionally illustrative values, not a copied or licensed composition table.
export const foods: Food[] = [
  { id: "nasi", name: "Nasi putih", aliases: ["nasi"], category: "Karbohidrat", state: "matang", per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 }, servings: [{ unit: "centong", grams: 100 }, { unit: "porsi", grams: 150 }], source: "Data contoh untuk demo", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "ayam-bakar", name: "Ayam bakar", aliases: ["ayam panggang"], category: "Lauk", state: "olahan", per100g: { calories: 190, protein: 27, carbs: 3, fat: 8 }, servings: [{ unit: "potong", grams: 100 }], source: "Data contoh untuk demo; resep bervariasi", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "ayam-goreng", name: "Ayam goreng", aliases: ["ayam"], category: "Lauk", state: "olahan", per100g: { calories: 260, protein: 25, carbs: 7, fat: 15 }, servings: [{ unit: "potong", grams: 100 }], source: "Data contoh untuk demo; resep bervariasi", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "telur", name: "Telur rebus", aliases: ["telur"], category: "Lauk", state: "matang", per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 }, servings: [{ unit: "butir", grams: 50 }], source: "Data contoh untuk demo", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "tempe", name: "Tempe goreng", aliases: ["tempe"], category: "Lauk", state: "olahan", per100g: { calories: 220, protein: 15, carbs: 13, fat: 12 }, servings: [{ unit: "potong", grams: 50 }], source: "Data contoh untuk demo; minyak bervariasi", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "tahu", name: "Tahu goreng", aliases: ["tahu"], category: "Lauk", state: "olahan", per100g: { calories: 190, protein: 10, carbs: 7, fat: 14 }, servings: [{ unit: "potong", grams: 50 }], source: "Data contoh untuk demo; minyak bervariasi", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "sayur", name: "Tumis sayur", aliases: ["sayur", "capcay"], category: "Sayur", state: "olahan", per100g: { calories: 75, protein: 2, carbs: 8, fat: 4 }, servings: [{ unit: "porsi", grams: 100 }], source: "Data contoh untuk demo; minyak bervariasi", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "sambal", name: "Sambal", aliases: ["sambal merah"], category: "Pelengkap", state: "olahan", per100g: { calories: 120, protein: 2, carbs: 12, fat: 7 }, servings: [{ unit: "sdm", grams: 15 }], source: "Data contoh untuk demo; resep bervariasi", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "pisang", name: "Pisang", aliases: ["banana"], category: "Buah", state: "matang", per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 }, servings: [{ unit: "buah", grams: 100 }], source: "Data contoh untuk demo", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "oat", name: "Oatmeal matang", aliases: ["oat"], category: "Karbohidrat", state: "matang", per100g: { calories: 71, protein: 2.5, carbs: 12, fat: 1.5 }, servings: [{ unit: "mangkuk", grams: 200 }], source: "Data contoh untuk demo", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "soto", name: "Soto ayam", aliases: ["soto"], category: "Hidangan", state: "olahan", per100g: { calories: 95, protein: 8, carbs: 7, fat: 4 }, servings: [{ unit: "mangkuk", grams: 300 }], source: "Data contoh untuk demo; resep bervariasi", sourceDate: "2026-10-11", quality: "contoh" },
  { id: "rendang", name: "Rendang sapi", aliases: ["rendang"], category: "Lauk", state: "olahan", per100g: { calories: 290, protein: 23, carbs: 6, fat: 19 }, servings: [{ unit: "potong", grams: 75 }], source: "Data contoh untuk demo; resep bervariasi", sourceDate: "2026-10-11", quality: "contoh" },
];

export const mealTypes: MealType[] = ["Sarapan", "Makan siang", "Makan malam", "Camilan"];
export const zero: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0 };
export function nutrientsFor(item: MealItem): Nutrients {
  const factor = item.grams / 100;
  return { calories: item.per100g.calories * factor, protein: item.per100g.protein * factor, carbs: item.per100g.carbs * factor, fat: item.per100g.fat * factor };
}
export function total(items: MealItem[]): Nutrients {
  return items.reduce((sum, item) => {
    const n = nutrientsFor(item);
    return { calories: sum.calories + n.calories, protein: sum.protein + n.protein, carbs: sum.carbs + n.carbs, fat: sum.fat + n.fat };
  }, { ...zero });
}
export function itemFromFood(food: Food): MealItem {
  const serving = food.servings[0];
  return { id: crypto.randomUUID(), foodId: food.id, name: food.name, quantity: 1, unit: serving.unit, gramsPerUnit: serving.grams, grams: serving.grams, per100g: { ...food.per100g }, source: food.source, corrected: false };
}
export function editMealItem(items: MealItem[], id: string, patch: Partial<MealItem>): MealItem[] {
  return items.map((item) => item.id === id ? { ...item, ...patch, corrected: true } : item);
}
export function changeServing(item: MealItem, unit: string): MealItem {
  const food = foods.find((record) => record.id === item.foodId);
  const gramsPerUnit = unit === "gram" ? 1 : food?.servings.find((serving) => serving.unit === unit)?.grams;
  if (!gramsPerUnit) return item;
  const quantity = unit === "gram" ? item.grams : Math.round(item.grams / gramsPerUnit * 10) / 10;
  return { ...item, unit, quantity, gramsPerUnit, grams: quantity * gramsPerUnit, corrected: true };
}
export function matchCandidateFood(candidateName: string): Food | null {
  const normalize = (value: string) => value.toLocaleLowerCase("id-ID").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const name = normalize(candidateName);
  return foods.find((food) => normalize(food.name) === name || food.aliases.some((alias) => normalize(alias) === name)) ?? null;
}
export function suggestedTarget(profile: Profile): number {
  const bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + (profile.sex === "pria" ? 5 : -161);
  const multiplier = { rendah: 1.2, ringan: 1.35, sedang: 1.5, tinggi: 1.65 }[profile.activity];
  const adjustment = { turun: -300, jaga: 0, naik: 250 }[profile.goal];
  return Math.max(1200, Math.round((bmr * multiplier + adjustment) / 10) * 10);
}
export const defaultProfile: Profile = { name: "", age: 28, height: 165, weight: 65, sex: "wanita", activity: "ringan", goal: "jaga", calorieTarget: 1850 };
