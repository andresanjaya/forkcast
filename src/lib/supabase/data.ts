import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultProfile, type Meal, type MealItem, type Profile, type SavedMeal, type WeightEntry } from "@/lib/food";
import type { MacroTargets, TargetRecord } from "@/lib/target";
import type { PackagedProduct, UserProduct } from "@/lib/packaged-food";
import { savedMealError, type FoodCorrection } from "@/lib/meal-memory";
import { MEAL_PHOTO_BUCKET } from "@/lib/meal-photos";
import type { AppLanguage } from "@/lib/language";

type Row = Record<string, unknown>;
const numeric = (value: unknown) => Number(value ?? 0);
const optionalTableMissing = (error: { code?: string } | null) => error?.code === "42P01" || error?.code === "PGRST205";
const mealItemFromRow = (row: Row): MealItem => ({
  id: String(row.id), foodId: row.food_id ? String(row.food_id) : null,
  name: String(row.name_snapshot), quantity: numeric(row.quantity), unit: String(row.unit),
  gramsPerUnit: numeric(row.grams_per_unit), grams: numeric(row.grams),
  per100g: { calories: numeric(row.calories_per_100g), protein: numeric(row.protein_per_100g), carbs: numeric(row.carbs_per_100g), fat: numeric(row.fat_per_100g) },
  source: String(row.source_label), corrected: Boolean(row.user_corrected),
  packaged: row.product_snapshot && typeof row.product_snapshot === "object" ? row.product_snapshot as MealItem["packaged"] : undefined,
});

export async function loadAccountData(client: SupabaseClient, userId: string) {
  const [profileResult, mealsResult, savedResult, weightsResult, targetsResult, correctionsResult, productsResult] = await Promise.all([
    client.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    client.from("meals").select("*").eq("user_id", userId).order("eaten_at", { ascending: false }),
    client.from("saved_meals").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    client.from("weight_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }),
    client.from("calorie_target_history").select("*").eq("user_id", userId).order("effective_at", { ascending: false }),
    client.from("food_corrections").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    client.from("user_products").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100),
  ]);
  for (const result of [profileResult, mealsResult, savedResult, weightsResult, targetsResult, correctionsResult]) if (result.error) throw result.error;
  if (productsResult.error && !optionalTableMissing(productsResult.error)) throw productsResult.error;
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
    ...(row.photo_path ? { photoPath: String(row.photo_path), photoBytes: numeric(row.photo_bytes) } : {}),
  }));
  const photoPaths = meals.map((meal) => meal.photoPath).filter((path): path is string => Boolean(path));
  if (photoPaths.length) {
    const { data: links } = await client.storage.from(MEAL_PHOTO_BUCKET).createSignedUrls(photoPaths, 24 * 60 * 60);
    const previewByPath = new Map<string, string>();
    for (const link of links ?? []) if (link.path && link.signedUrl) previewByPath.set(link.path, link.signedUrl);
    for (const meal of meals) if (meal.photoPath) meal.photoPreview = previewByPath.get(meal.photoPath);
  }
  const savedMeals: SavedMeal[] = ((savedResult.data ?? []) as Row[]).map((row) => ({
    id: String(row.id), title: String(row.title), note: String(row.note ?? ""),
    category: row.category as SavedMeal["category"], items: Array.isArray(row.items) ? row.items as MealItem[] : [],
    createdAt: String(row.created_at), updatedAt: String(row.updated_at ?? row.created_at),
  }));
  const weights: WeightEntry[] = ((weightsResult.data ?? []) as Row[]).filter((row) => !row.superseded_at).map((row) => ({ id: String(row.id), date: String(row.entry_date), weight: numeric(row.weight_kg) }));
  const targets: TargetRecord[] = ((targetsResult.data ?? []) as Row[]).map((row) => ({
    id: String(row.id), calories: numeric(row.calories), source: row.source as TargetRecord["source"],
    formulaVersion: row.formula_version ? String(row.formula_version) : null,
    inputs: row.inputs as TargetRecord["inputs"],
    macros: row.protein_target !== null && row.protein_target !== undefined && row.carbs_target !== null && row.carbs_target !== undefined && row.fat_target !== null && row.fat_target !== undefined
      ? { protein: numeric(row.protein_target), carbs: numeric(row.carbs_target), fat: numeric(row.fat_target) } as MacroTargets : undefined,
    effectiveAt: String(row.effective_at),
    createdAt: String(row.created_at), note: String(row.note ?? ""),
  }));
  const corrections: FoodCorrection[] = ((correctionsResult.data ?? []) as Row[]).map((row) => ({
    id: String(row.id), candidateText: String(row.candidate_text), candidateKey: String(row.candidate_key),
    alias: String(row.selected_alias ?? ""), item: row.item_snapshot as MealItem, createdAt: String(row.created_at),
  }));
  const userProducts: UserProduct[] = ((productsResult.data ?? []) as Row[]).map((row) => ({
    id: String(row.id), product: row.product_snapshot as PackagedProduct, updatedAt: String(row.updated_at),
  }));
  return { profile, locale: p?.locale === "en-US" ? "en-US" as AppLanguage : p?.locale === "id-ID" ? "id-ID" as AppLanguage : null, hasProfile: Boolean(p), meals, savedMeals, weights, targets, corrections, userProducts };
}

export async function saveAccountLanguage(client: SupabaseClient, userId: string, language: AppLanguage) {
  const { error } = await client.from("profiles").update({ locale: language }).eq("user_id", userId);
  if (error) throw error;
}

export async function saveProfileWithWeight(client: SupabaseClient, profile: Profile, localDate: string, recordWeight = false) {
  const { error } = await client.rpc("save_profile_with_weight", {
    p_display_name: profile.name.trim(), p_age: profile.age, p_height_cm: profile.height,
    p_weight_kg: profile.weight, p_formula_sex: profile.sex, p_activity: profile.activity,
    p_goal: profile.goal, p_calorie_target: profile.calorieTarget, p_local_date: localDate,
    p_record_weight: recordWeight,
  });
  if (error) throw error;
}

export async function saveCalorieTarget(client: SupabaseClient, record: TargetRecord) {
  const { error } = record.macros ? await client.rpc("save_nutrition_target", {
    p_id: record.id, p_calories: record.calories, p_protein: record.macros.protein,
    p_carbs: record.macros.carbs, p_fat: record.macros.fat, p_source: record.source,
    p_formula_version: record.formulaVersion, p_inputs: record.inputs,
    p_effective_at: record.effectiveAt, p_note: record.note,
  }) : await client.rpc("save_calorie_target", {
    p_id: record.id, p_calories: record.calories, p_source: record.source,
    p_formula_version: record.formulaVersion, p_inputs: record.inputs,
    p_effective_at: record.effectiveAt, p_note: record.note,
  });
  if (error) throw error;
}

export async function uploadMealPhoto(client: SupabaseClient, userId: string, mealId: string, photo: Blob, upsert = false): Promise<string> {
  const path = `${userId}/${mealId}.jpg`;
  const { error } = await client.storage.from(MEAL_PHOTO_BUCKET).upload(path, photo, { contentType: "image/jpeg", upsert, cacheControl: "86400" });
  if (error) throw error;
  return path;
}

export async function removeMealPhoto(client: SupabaseClient, path: string): Promise<void> {
  const { error } = await client.storage.from(MEAL_PHOTO_BUCKET).remove([path]);
  if (error) throw error;
}


export async function insertMeal(client: SupabaseClient, userId: string, meal: Meal) {
  const { error: mealError } = await client.from("meals").insert({
    id: meal.id, user_id: userId, eaten_at: meal.eatenAt ?? meal.createdAt, local_date: meal.date,
    meal_type: meal.type, title: meal.title, entry_method: meal.method, created_at: meal.createdAt,
    ...(meal.photoPath ? { photo_path: meal.photoPath, photo_mime: "image/jpeg", photo_bytes: meal.photoBytes } : {}),
  });
  if (mealError) throw mealError;
  const { error: itemsError } = await client.from("meal_items").insert(meal.items.map((item, position) => ({
    id: item.id, meal_id: meal.id, user_id: userId, food_id: item.foodId, name_snapshot: item.name,
    quantity: item.quantity, unit: item.unit, grams_per_unit: item.gramsPerUnit, grams: item.grams,
    calories_per_100g: item.packaged ? null : item.per100g.calories, protein_per_100g: item.packaged ? null : item.per100g.protein,
    carbs_per_100g: item.packaged ? null : item.per100g.carbs, fat_per_100g: item.packaged ? null : item.per100g.fat,
    ...(item.packaged ? { product_snapshot: item.packaged } : {}),
    source_label: item.source, user_corrected: item.corrected, position,
  })));
  if (itemsError) {
    await client.from("meals").delete().eq("id", meal.id).eq("user_id", userId);
    throw itemsError;
  }
}

export async function importDemoMeal(client: SupabaseClient, userId: string, meal: Meal) {
  const { error: mealError } = await client.from("meals").upsert({
    id: meal.id, user_id: userId, eaten_at: meal.eatenAt ?? meal.createdAt, local_date: meal.date,
    meal_type: meal.type, title: meal.title, entry_method: meal.method, created_at: meal.createdAt,
    ...(meal.photoPath ? { photo_path: meal.photoPath, photo_mime: "image/jpeg", photo_bytes: meal.photoBytes } : {}),
  }, { onConflict: "id" });
  if (mealError) throw mealError;
  const { error: itemsError } = await client.from("meal_items").upsert(meal.items.map((item, position) => ({
    id: item.id, meal_id: meal.id, user_id: userId, food_id: item.foodId, name_snapshot: item.name,
    quantity: item.quantity, unit: item.unit, grams_per_unit: item.gramsPerUnit, grams: item.grams,
    calories_per_100g: item.packaged ? null : item.per100g.calories, protein_per_100g: item.packaged ? null : item.per100g.protein,
    carbs_per_100g: item.packaged ? null : item.per100g.carbs, fat_per_100g: item.packaged ? null : item.per100g.fat,
    ...(item.packaged ? { product_snapshot: item.packaged } : {}),
    source_label: item.source, user_corrected: item.corrected, position,
  })), { onConflict: "id" });
  if (itemsError) throw itemsError;
}

export async function importDemoSavedMeal(client: SupabaseClient, userId: string, saved: SavedMeal) {
  const { error } = await client.from("saved_meals").upsert({ id: saved.id, user_id: userId, title: saved.title, note: saved.note ?? "", category: saved.category ?? null, items: saved.items }, { onConflict: "id" });
  if (error) throw error;
}

export async function importDemoWeights(client: SupabaseClient, userId: string, weights: WeightEntry[]) {
  const { data, error } = await client.from("weight_entries").select("entry_date").eq("user_id", userId).is("superseded_at", null);
  if (error) throw error;
  const existing = new Set((data ?? []).map((row) => String(row.entry_date)));
  for (const entry of weights) {
    if (existing.has(entry.date)) continue;
    const { error: insertError } = await client.from("weight_entries").insert({
      id: entry.id, user_id: userId, entry_date: entry.date, weight_kg: entry.weight,
    });
    if (insertError) throw insertError;
    existing.add(entry.date);
  }
}

export async function deleteMeal(client: SupabaseClient, userId: string, id: string) {
  const { error } = await client.from("meals").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
export async function insertSavedMeal(client: SupabaseClient, userId: string, saved: SavedMeal) {
  const validation = savedMealError(saved.title, saved.note ?? "", saved.items);
  if (validation) throw new Error(validation);
  const { error } = await client.from("saved_meals").insert({
    id: saved.id, user_id: userId, title: saved.title.trim(), note: saved.note?.trim() ?? "",
    category: saved.category ?? null, items: saved.items,
  });
  if (error) throw error;
}
export async function updateSavedMeal(client: SupabaseClient, userId: string, saved: SavedMeal) {
  const validation = savedMealError(saved.title, saved.note ?? "", saved.items);
  if (validation) throw new Error(validation);
  const { data, error } = await client.from("saved_meals").update({
    title: saved.title.trim(), note: saved.note?.trim() ?? "", category: saved.category ?? null,
    items: saved.items, updated_at: new Date().toISOString(),
  }).eq("id", saved.id).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) throw error ?? new Error("Kombinasi tidak ditemukan.");
}
export async function deleteSavedMeal(client: SupabaseClient, userId: string, id: string) {
  const { data, error } = await client.from("saved_meals").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) throw error ?? new Error("Kombinasi tidak ditemukan.");
}
export async function insertFoodCorrections(client: SupabaseClient, userId: string, corrections: FoodCorrection[]) {
  if (!corrections.length) return;
  const { error } = await client.from("food_corrections").upsert(corrections.map((entry) => ({
    id: entry.id, user_id: userId, candidate_text: entry.candidateText, candidate_key: entry.candidateKey,
    selected_food_id: entry.item.foodId, selected_name: entry.item.name, selected_alias: entry.alias,
    quantity: entry.item.quantity, unit: entry.item.unit, grams: entry.item.grams,
    item_snapshot: entry.item, created_at: entry.createdAt,
  })), { onConflict: "id" });
  if (error) throw error;
}
export async function deleteWeight(client: SupabaseClient, id: string) {
  const { error } = await client.rpc("remove_weight_entry", { p_id: id });
  if (error) throw error;
}
export async function deleteAllAccountData(client: SupabaseClient, userId: string) {
  for (const table of ["meals", "saved_meals", "food_corrections", "user_products", "weight_entries", "calorie_target_history", "profiles"]) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    if (error && !(table === "user_products" && optionalTableMissing(error))) throw error;
  }
  while (true) {
    const { data, error } = await client.storage.from(MEAL_PHOTO_BUCKET).list(userId, { limit: 100 });
    if (error?.status === 404) break;
    if (error) throw error;
    const paths = (data ?? []).filter((entry) => entry.name && entry.name !== ".emptyFolderPlaceholder").map((entry) => `${userId}/${entry.name}`);
    if (!paths.length) break;
    const { error: removeError } = await client.storage.from(MEAL_PHOTO_BUCKET).remove(paths);
    if (removeError) throw removeError;
  }
}
export async function saveUserProduct(client: SupabaseClient, userId: string, product: PackagedProduct) {
  const payload = { user_id: userId, barcode: product.barcode, product_snapshot: product, updated_at: new Date().toISOString() };
  const { error } = product.barcode
    ? await client.from("user_products").upsert(payload, { onConflict: "user_id,barcode" })
    : await client.from("user_products").insert(payload);
  if (error) throw error;
}
