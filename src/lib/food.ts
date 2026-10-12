export type Nutrients = { calories: number; protein: number; carbs: number; fat: number };
export type OptionalNutrients = { [K in keyof Nutrients]: number | null };
export type PackagedSnapshot = {
  barcode: string | null;
  brand: string;
  packageQuantity: string;
  servingSize: string;
  basis: { amount: number; unit: "g" | "ml" | "serving" };
  nutrients: OptionalNutrients;
  provider: "Open Food Facts" | "Label kemasan pengguna";
  sourceUrl: string | null;
  lookedUpAt: string | null;
  note: string;
  userEdited?: boolean;
};
export type Food = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  state: "matang" | "olahan";
  per100g: Nutrients;
  servings: { unit: string; grams: number; approximate?: boolean }[];
  source: string;
  sourceDate: string;
  quality: "contoh" | "terverifikasi";
};
export type LibraryFood = Food & {
  sourceReference: string;
  sourceAdditionalReference?: string;
  sourceVersion: string;
  dataStatus: "sumber" | "padanan";
  preparationNote: string;
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
  packaged?: PackagedSnapshot;
};
export type Meal = { id: string; date: string; eatenAt?: string; type: MealType; title: string; method: "manual" | "foto" | "tersimpan"; items: MealItem[]; createdAt: string };
export type SavedMeal = {
  id: string;
  title: string;
  note?: string;
  category?: MealType | null;
  items: MealItem[];
  createdAt?: string;
  updatedAt?: string;
};
export type WeightEntry = { id: string; date: string; weight: number };
export type Profile = {
  name: string;
  age: number;
  height: number;
  weight: number;
  sex: "pria" | "wanita" | "tidak_menyebutkan";
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

// Curated USDA SR28 records. Older illustrative foods above remain available in
// the existing manual and photo flows; only these documented records appear in
// the new Indonesian library. Source references are listed in docs/food-library-sources.md.
const sr28 = "USDA FoodData Central · SR28 (2015)";
const sr28Report = (group: string) => `https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg${group}.pdf`;
export const libraryFoods: LibraryFood[] = [
  { id: "lib-nasi-putih", name: "Nasi putih matang", aliases: ["nasi putih", "nasi", "beras matang"], category: "Makanan pokok", state: "matang", per100g: { calories: 130, protein: 2.69, carbs: 28.17, fat: 0.28 }, servings: [{ unit: "cangkir", grams: 158, approximate: true }, { unit: "gram", grams: 1 }], source: `${sr28} · NDB 20345`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("20"), sourceVersion: "SR28 (2015), NDB 20345", dataStatus: "padanan", preparationNote: "Padanan nasi putih matang dengan garam. Ukuran cangkir dapat berbeda dari centong atau porsi rumah." },
  { id: "lib-telur-rebus", name: "Telur rebus", aliases: ["telur rebus ayam", "telur matang"], category: "Lauk", state: "matang", per100g: { calories: 155, protein: 12.58, carbs: 1.12, fat: 10.61 }, servings: [{ unit: "butir besar", grams: 50, approximate: true }, { unit: "gram", grams: 1 }], source: `${sr28} · NDB 01129`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("01"), sourceVersion: "SR28 (2015), NDB 01129", dataStatus: "sumber", preparationNote: "Telur ayam rebus tanpa tambahan minyak. Berat butir mengacu pada bagian yang dimakan." },
  { id: "lib-tempe-matang", name: "Tempe matang tanpa minyak", aliases: ["tempe", "tempe kukus", "tempe rebus"], category: "Lauk", state: "matang", per100g: { calories: 195, protein: 19.91, carbs: 7.62, fat: 11.38 }, servings: [{ unit: "gram", grams: 1 }], source: `${sr28} · NDB 16174`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("16"), sourceVersion: "SR28 (2015), NDB 16174", dataStatus: "padanan", preparationNote: "Padanan tempe matang tanpa minyak tambahan; tempe goreng memiliki nilai berbeda." },
  { id: "lib-tahu-putih", name: "Tahu putih padat", aliases: ["tahu putih", "tahu padat"], category: "Lauk", state: "olahan", per100g: { calories: 76, protein: 8.08, carbs: 1.87, fat: 4.78 }, servings: [{ unit: "seperempat blok", grams: 81, approximate: true }, { unit: "gram", grams: 1 }], source: `${sr28} · NDB 16426`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("16"), sourceVersion: "SR28 (2015), NDB 16426", dataStatus: "padanan", preparationNote: "Padanan tahu padat mentah; bukan tahu goreng. Berat blok bervariasi antarproduk." },
  { id: "lib-bayam-rebus", name: "Bayam rebus tanpa garam", aliases: ["bayam rebus", "sayur bayam tanpa kuah"], category: "Sayur", state: "matang", per100g: { calories: 34, protein: 4.01, carbs: 4.8, fat: 0.87 }, servings: [{ unit: "gram", grams: 1 }], source: `${sr28} · NDB 11458`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("11"), sourceVersion: "SR28 (2015), NDB 11458", dataStatus: "padanan", preparationNote: "Padanan spinach rebus dan ditiriskan; kuah dan bumbu sayur bayam tidak termasuk." },
  { id: "lib-pisang", name: "Pisang segar", aliases: ["pisang", "buah pisang", "banana"], category: "Buah", state: "matang", per100g: { calories: 89, protein: 1.09, carbs: 22.84, fat: 0.33 }, servings: [{ unit: "buah kecil", grams: 81, approximate: true }, { unit: "gram", grams: 1 }], source: `${sr28} · NDB 09040`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("09"), sourceVersion: "SR28 (2015), NDB 09040", dataStatus: "padanan", preparationNote: "Padanan pisang mentah siap makan; jenis dan ukuran pisang lokal dapat berbeda." },
  { id: "lib-pepaya", name: "Pepaya segar", aliases: ["pepaya", "papaya"], category: "Buah", state: "matang", per100g: { calories: 43, protein: 0.47, carbs: 10.82, fat: 0.26 }, servings: [{ unit: "gram", grams: 1 }], source: `${sr28} · NDB 09226`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("09"), sourceVersion: "SR28 (2015), NDB 09226", dataStatus: "sumber", preparationNote: "Nilai untuk daging buah pepaya segar, tanpa kulit dan biji." },
  { id: "lib-air-kelapa", name: "Air kelapa kemasan tanpa gula", aliases: ["air kelapa", "minuman kelapa tanpa gula"], category: "Minuman", state: "olahan", per100g: { calories: 18, protein: 0.22, carbs: 4.24, fat: 0 }, servings: [{ unit: "gram", grams: 1 }], source: `${sr28} · NDB 14090`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("14"), sourceVersion: "SR28 (2015), NDB 14090", dataStatus: "padanan", preparationNote: "Padanan air kelapa siap minum tanpa gula. Komposisi air kelapa segar dapat berbeda; gunakan gram dari label bila tersedia." },
  { id: "lib-nasi-telur-rebus", name: "Nasi dengan telur rebus", aliases: ["nasi telur rebus", "nasi telur"], category: "Hidangan", state: "olahan", per100g: { calories: 138.33, protein: 5.99, carbs: 19.15, fat: 3.72 }, servings: [{ unit: "porsi", grams: 150, approximate: true }, { unit: "gram", grams: 1 }], source: `${sr28} · dihitung dari NDB 20345 dan 01129`, sourceDate: "2015", quality: "terverifikasi", sourceReference: sr28Report("20"), sourceAdditionalReference: sr28Report("01"), sourceVersion: "SR28 (2015), NDB 20345 + 01129", dataStatus: "padanan", preparationNote: "Perkiraan untuk 100 g nasi putih matang dan 50 g telur rebus, tanpa saus atau minyak. Nilai per 100 g dihitung dari kedua bahan." },
];
export const allFoods = [...foods, ...libraryFoods];

export function normalizeFoodSearch(value: string): string {
  return value.toLocaleLowerCase("id-ID").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function searchLibraryFoods(query: string): LibraryFood[] {
  const normalized = normalizeFoodSearch(query);
  if (!normalized) return libraryFoods;
  const tokens = normalized.split(" ");
  const rank = (food: LibraryFood) => {
    const name = normalizeFoodSearch(food.name);
    const aliases = food.aliases.map(normalizeFoodSearch);
    if (name === normalized) return 0;
    if (aliases.includes(normalized)) return 1;
    if (name.startsWith(normalized)) return 2;
    if (aliases.some((alias) => alias.startsWith(normalized))) return 3;
    if (name.includes(normalized)) return 4;
    if (aliases.some((alias) => alias.includes(normalized))) return 5;
    if (tokens.every((token) => [name, ...aliases].some((value) => value.includes(token)))) return 6;
    return null;
  };
  return libraryFoods.map((food) => ({ food, score: rank(food) })).filter((entry): entry is { food: LibraryFood; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name, "id-ID")).map((entry) => entry.food);
}

export function searchPhotoFoods(query: string): Food[] {
  const normalized = normalizeFoodSearch(query);
  if (!normalized) return allFoods.slice(0, 12);
  const tokens = normalized.split(" ");
  return allFoods.map((food) => {
    const names = [food.name, ...food.aliases].map(normalizeFoodSearch);
    const score = names[0] === normalized ? 0 : names.includes(normalized) ? 1
      : names[0].startsWith(normalized) ? 2 : names.some((name) => name.startsWith(normalized)) ? 3
      : tokens.every((token) => names.some((name) => name.includes(token))) ? 4 : null;
    return { food, score };
  }).filter((entry): entry is { food: Food; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name, "id-ID"))
    .slice(0, 12).map((entry) => entry.food);
}

export const mealTypes: MealType[] = ["Sarapan", "Makan siang", "Makan malam", "Camilan"];
export const zero: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0 };
export function nutrientsFor(item: MealItem): OptionalNutrients {
  const factor = item.packaged ? item.grams / item.packaged.basis.amount : item.grams / 100;
  const values = item.packaged?.nutrients ?? item.per100g;
  const scaled = (value: number | null) => value === null ? null : value * factor;
  return { calories: scaled(values.calories), protein: scaled(values.protein), carbs: scaled(values.carbs), fat: scaled(values.fat) };
}
export function total(items: MealItem[]): OptionalNutrients {
  return items.reduce((sum, item) => {
    const n = nutrientsFor(item);
    const add = (a: number | null, b: number | null) => a === null || b === null ? null : a + b;
    return { calories: add(sum.calories, n.calories), protein: add(sum.protein, n.protein), carbs: add(sum.carbs, n.carbs), fat: add(sum.fat, n.fat) };
  }, { ...zero } as OptionalNutrients);
}
export function itemAmountLabel(item: MealItem): string {
  return `${item.grams.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${item.packaged ? item.packaged.basis.unit === "serving" ? "sajian" : item.packaged.basis.unit : "g"}`;
}
export function itemFromFood(food: Food): MealItem {
  const serving = food.servings[0];
  const quantity = serving.unit === "gram" ? 100 : 1;
  return { id: crypto.randomUUID(), foodId: food.id, name: food.name, quantity, unit: serving.unit, gramsPerUnit: serving.grams, grams: quantity * serving.grams, per100g: { ...food.per100g }, source: food.source, corrected: false };
}
export function editMealItem(items: MealItem[], id: string, patch: Partial<MealItem>): MealItem[] {
  return items.map((item) => item.id === id ? { ...item, ...patch, corrected: true } : item);
}
export function changeServing(item: MealItem, unit: string): MealItem {
  if (item.packaged) return item;
  const food = allFoods.find((record) => record.id === item.foodId);
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
export const defaultProfile: Profile = { name: "", age: 28, height: 165, weight: 65, sex: "tidak_menyebutkan", activity: "ringan", goal: "jaga", calorieTarget: 1850 };
