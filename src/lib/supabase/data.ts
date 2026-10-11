import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultProfile, type Meal, type MealItem, type Profile, type SavedMeal, type WeightEntry } from "@/lib/food";

type Row = Record<string, unknown>;
const numeric = (value: unknown) => Number(value ?? 0);
const mealItemFromRow = (row: Row): MealItem => ({
  id: String(row.id), foodId: row.food_id ? String(row.food_id) : null,
  name: String(row.name_snapshot), quantity: numeric(row.quantity), unit: String(row.unit),
  gramsPerUnit: numeric(row.grams_per_unit), grams: numeric(row.grams),
  per100g: { calories: numeric(row.calories_per_100g), protein: numeric(row.protein_per_100g), carbs: numeric(row.carbs_per_100g), fat: numeric(row.fat_per_100g) },
  source: String(row.source_label), corrected: Boolean(row.user_corrected),
});

export async function loadAccountData(client: SupabaseClient, userId: string) {
  const [profileResult, mealsResult, savedResult, weightsResult] = await Promise.all([
    client.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    client.from("meals").select("*").eq("user_id", userId).order("eaten_at", { ascending: false }),
    client.from("saved_meals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    client.from("weight_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }),
  ]);
  for (const result of [profileResult, mealsResult, savedResult, weightsResult]) if (result.error) throw result.error;
  const mealRows = (mealsResult.data ?? []) as Row[];
  const itemResult = mealRows.length
    ? await client.from("meal_items").select("*").eq("user_id", userId).order("position", { ascending: true })
    : { data: [], error: null };
  if (itemResult.error) throw itemResult.error;
  const itemsByMeal = new Map<string, MealItem[]>();
  for (const row of (itemResult.data ?? []) as Row[]) {
    const id = String(row.meal_id);
    itemsByMeal.set(id, [...(itemsByMeal.get(id) ?? []), mealItemFromRow(row)]);
  }
  const p = profileResult.data as Row | null;
  const profile: Profile = p ? {
    name: String(p.display_name ?? ""), age: numeric(p.age), height: numeric(p.height_cm), weight: numeric(p.weight_kg),
    sex: p.formula_sex as Profile["sex"], activity: p.activity as Profile["activity"], goal: p.goal as Profile["goal"], calorieTarget: numeric(p.calorie_target),
  } : { ...defaultProfile };
  const meals: Meal[] = mealRows.map((row) => ({
    id: String(row.id), date: String(row.local_date), eatenAt: String(row.eaten_at), type: row.meal_type as Meal["type"],
    title: String(row.title), method: row.entry_method as Meal["method"], createdAt: String(row.created_at), items: itemsByMeal.get(String(row.id)) ?? [],
  }));
  const savedMeals: SavedMeal[] = ((savedResult.data ?? []) as Row[]).map((row) => ({ id: String(row.id), title: String(row.title), items: Array.isArray(row.items) ? row.items as MealItem[] : [] }));
  const weights: WeightEntry[] = ((weightsResult.data ?? []) as Row[]).map((row) => ({ id: String(row.id), date: String(row.entry_date), weight: numeric(row.weight_kg) }));
  return { profile, meals, savedMeals, weights };
}

export async function upsertProfile(client: SupabaseClient, userId: string, profile: Profile) {
  const { error } = await client.from("profiles").upsert({
    user_id: userId, display_name: profile.name, locale: "id-ID", age: profile.age, height_cm: profile.height, weight_kg: profile.weight,
    formula_sex: profile.sex, activity: profile.activity, goal: profile.goal, calorie_target: profile.calorieTarget, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function insertMeal(client: SupabaseClient, userId: string, meal: Meal) {
  const { error: mealError } = await client.from("meals").insert({
    id: meal.id, user_id: userId, eaten_at: meal.eatenAt ?? meal.createdAt, local_date: meal.date,
    meal_type: meal.type, title: meal.title, entry_method: meal.method, created_at: meal.createdAt,
  });
  if (mealError) throw mealError;
  const { error: itemsError } = await client.from("meal_items").insert(meal.items.map((item, position) => ({
    id: item.id, meal_id: meal.id, user_id: userId, food_id: item.foodId, name_snapshot: item.name,
    quantity: item.quantity, unit: item.unit, grams_per_unit: item.gramsPerUnit, grams: item.grams,
    calories_per_100g: item.per100g.calories, protein_per_100g: item.per100g.protein,
    carbs_per_100g: item.per100g.carbs, fat_per_100g: item.per100g.fat,
    source_label: item.source, user_corrected: item.corrected, position,
  })));
  if (itemsError) {
    await client.from("meals").delete().eq("id", meal.id).eq("user_id", userId);
    throw itemsError;
  }
}

export async function deleteMeal(client: SupabaseClient, userId: string, id: string) {
  const { error } = await client.from("meals").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
export async function insertSavedMeal(client: SupabaseClient, userId: string, saved: SavedMeal) {
  const { error } = await client.from("saved_meals").insert({ id: saved.id, user_id: userId, title: saved.title, items: saved.items });
  if (error) throw error;
}
export async function insertWeight(client: SupabaseClient, userId: string, entry: WeightEntry) {
  const { error } = await client.from("weight_entries").insert({ id: entry.id, user_id: userId, entry_date: entry.date, weight_kg: entry.weight });
  if (error) throw error;
}
export async function deleteWeight(client: SupabaseClient, userId: string, id: string) {
  const { error } = await client.from("weight_entries").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
export async function deleteAllAccountData(client: SupabaseClient, userId: string) {
  for (const table of ["meals", "saved_meals", "weight_entries", "profiles"]) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }
}
