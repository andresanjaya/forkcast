import type { Meal, MealItem, SavedMeal } from "./food";

export type FoodCorrection = {
  id: string;
  candidateText: string;
  candidateKey: string;
  alias: string;
  item: MealItem;
  createdAt: string;
};
export type FoodShortcut = { key: string; item: MealItem; lastLoggedAt: string; count: number };
export type PersonalMatch = { kind: "correction"; correction: FoodCorrection } | { kind: "saved"; saved: SavedMeal };

export function normalizeFoodKey(value: string): string {
  return value.toLocaleLowerCase("id-ID").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function copyMealItems(items: MealItem[]): MealItem[] {
  return items.map((item) => ({ ...item, id: crypto.randomUUID(), per100g: { ...item.per100g } }));
}

export function savedMealError(title: string, note: string, items: MealItem[]): string | null {
  if (!title.trim() || title.trim().length > 160) return "Nama kombinasi harus 1–160 karakter.";
  if (note.trim().length > 300) return "Catatan maksimal 300 karakter.";
  if (!items.length || items.length > 30) return "Kombinasi harus berisi 1–30 makanan.";
  if (items.some((item) => !item.name.trim() || item.name.trim().length > 160 || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.grams) || item.grams <= 0 || item.grams > 10000 || Object.values(item.per100g).some((value) => !Number.isFinite(value) || value < 0))) return "Periksa nama, porsi, dan nilai gizi setiap makanan.";
  return null;
}

function timestamp(meal: Meal): number {
  const value = new Date(meal.eatenAt ?? meal.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function shortcutKey(item: MealItem): string {
  return item.foodId ? `food:${item.foodId}` : `custom:${normalizeFoodKey(item.name)}`;
}

export function recentFoodShortcuts(meals: Meal[], limit = 6): FoodShortcut[] {
  const seen = new Set<string>();
  const result: FoodShortcut[] = [];
  for (const meal of [...meals].sort((a, b) => timestamp(b) - timestamp(a) || b.createdAt.localeCompare(a.createdAt))) {
    for (const item of meal.items) {
      const key = shortcutKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ key, item, lastLoggedAt: meal.eatenAt ?? meal.createdAt, count: 1 });
      if (result.length >= limit) return result;
    }
  }
  return result;
}

export function frequentFoodShortcuts(meals: Meal[], options: { days?: number; limit?: number; now?: Date } = {}): FoodShortcut[] {
  const { days = 30, limit = 6, now = new Date() } = options;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const counts = new Map<string, FoodShortcut>();
  for (const meal of [...meals].sort((a, b) => timestamp(b) - timestamp(a))) {
    const at = timestamp(meal);
    if (at < cutoff || at > now.getTime()) continue;
    for (const item of meal.items) {
      const key = shortcutKey(item);
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { key, item, lastLoggedAt: meal.eatenAt ?? meal.createdAt, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || b.lastLoggedAt.localeCompare(a.lastLoggedAt) || a.key.localeCompare(b.key)).slice(0, limit);
}

export function findPersonalMatch(candidate: string, corrections: FoodCorrection[], savedMeals: SavedMeal[]): PersonalMatch | null {
  const key = normalizeFoodKey(candidate);
  if (!key) return null;
  const correction = [...corrections].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((entry) => entry.candidateKey === key || normalizeFoodKey(entry.alias) === key);
  if (correction) return { kind: "correction", correction };
  const saved = savedMeals.find((entry) => normalizeFoodKey(entry.title) === key);
  return saved ? { kind: "saved", saved } : null;
}

export function correctionsFromReview(
  candidates: { candidateName: string }[],
  selections: Record<number, string>,
  originalFoodIds: Record<number, string | null>,
  aliases: Record<number, string>,
  items: MealItem[],
  createdAt: string,
): FoodCorrection[] {
  return candidates.flatMap((candidate, index) => {
    const item = items.find((entry) => entry.id === selections[index]);
    if (!item) return [];
    const alias = (aliases[index] ?? "").trim();
    if (!item.corrected && originalFoodIds[index] === item.foodId && !alias) return [];
    const candidateKey = normalizeFoodKey(candidate.candidateName);
    if (!candidateKey) return [];
    return [{ id: crypto.randomUUID(), candidateText: candidate.candidateName, candidateKey, alias, item: { ...item, per100g: { ...item.per100g } }, createdAt }];
  });
}
