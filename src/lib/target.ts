import type { Profile, WeightEntry } from "./food";

export const FORMULA_VERSION = "mifflin-st-jeor-v1";
export type TargetSource = "calculated" | "manual";
export type TargetInputs = Pick<Profile, "age" | "height" | "weight" | "sex" | "activity" | "goal"> & {
  bmr: number;
  activityMultiplier: number;
  goalAdjustment: number;
  unitSystem: "metric";
  gainKg?: number;
  gainWeeks?: number;
};
export type TargetEstimate = { calories: number; inputs: TargetInputs; formulaVersion: typeof FORMULA_VERSION };
export type MacroTargets = { protein: number; carbs: number; fat: number };
export type TargetRecord = {
  id: string;
  calories: number;
  source: TargetSource;
  formulaVersion: string | null;
  inputs: TargetInputs | null;
  effectiveAt: string;
  createdAt: string;
  note: string;
  macros?: MacroTargets;
};

export function estimateNutritionGoals(profile: Profile, gainKg = 0, gainWeeks = 12): (TargetEstimate & { macros: MacroTargets; gainKg: number; gainWeeks: number }) | null {
  const base = estimateTarget(profile);
  if (!base || !Number.isFinite(gainKg) || !Number.isFinite(gainWeeks) || gainKg < 0 || gainKg > 30 || gainWeeks < 1 || gainWeeks > 104) return null;
  // A bounded starting range for gradual gain, not a prediction of weight change.
  const weeklyGain = profile.goal === "naik" ? gainKg / gainWeeks : 0;
  const surplus = profile.goal !== "naik" ? 0 : weeklyGain <= 0.25 ? 300 : weeklyGain <= 0.5 ? 400 : 500;
  const calories = Math.round((base.calories - (profile.goal === "naik" ? 250 : 0) + surplus) / 10) * 10;
  if (!validTarget(calories)) return null;
  const protein = Math.round(profile.weight * 1.2);
  const fat = Math.round(calories * .3 / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { ...base, calories, macros: { protein, carbs, fat }, gainKg, gainWeeks, inputs: { ...base.inputs, goalAdjustment: surplus, gainKg, gainWeeks } };
}

export function validMacroTargets(macros: MacroTargets): boolean {
  return Object.values(macros).every((value) => Number.isInteger(value) && value >= 0 && value <= 1000);
}

export function profileError(profile: Profile, locale = "id-ID"): string | null {
  const message = (indonesian: string, english: string) => locale === "en-US" ? english : indonesian;
  if (profile.name.trim().length > 80) return message("Nama panggilan maksimal 80 karakter.", "Display name can contain up to 80 characters.");
  if (!Number.isInteger(profile.age) || profile.age < 18 || profile.age > 120) return message("Usia harus antara 18–120 tahun.", "Age must be between 18 and 120 years.");
  if (!Number.isFinite(profile.height) || profile.height < 100 || profile.height > 250) return message("Tinggi harus antara 100–250 cm.", "Height must be between 100 and 250 cm.");
  if (!Number.isFinite(profile.weight) || profile.weight < 20 || profile.weight > 400) return message("Berat harus antara 20–400 kg.", "Weight must be between 20 and 400 kg.");
  if (!["pria", "wanita", "tidak_menyebutkan"].includes(profile.sex)) return message("Pilih parameter rumus dasar.", "Choose a formula parameter.");
  if (!["rendah", "ringan", "sedang", "tinggi"].includes(profile.activity)) return message("Pilih tingkat aktivitas.", "Choose an activity level.");
  if (!["turun", "jaga", "naik"].includes(profile.goal)) return message("Pilih tujuan.", "Choose a goal.");
  return null;
}

export function validTarget(calories: number): boolean {
  return Number.isInteger(calories) && calories >= 1000 && calories <= 6000;
}

export function estimateTarget(profile: Profile): TargetEstimate | null {
  if (profileError(profile) || profile.sex === "tidak_menyebutkan") return null;
  const bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + (profile.sex === "pria" ? 5 : -161);
  const activityMultiplier = { rendah: 1.2, ringan: 1.35, sedang: 1.5, tinggi: 1.65 }[profile.activity];
  const goalAdjustment = { turun: -300, jaga: 0, naik: 250 }[profile.goal];
  const calories = Math.max(1200, Math.round((bmr * activityMultiplier + goalAdjustment) / 10) * 10);
  if (!validTarget(calories)) return null;
  return { calories, formulaVersion: FORMULA_VERSION, inputs: {
    age: profile.age, height: profile.height, weight: profile.weight, sex: profile.sex,
    activity: profile.activity, goal: profile.goal, bmr, activityMultiplier, goalAdjustment, unitSystem: "metric",
  } };
}

export function activeTarget(records: TargetRecord[]): TargetRecord | null {
  const now = Date.now();
  return [...records].filter((record) => new Date(record.effectiveAt).getTime() <= now)
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt) || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function addTargetRecord(records: TargetRecord[], record: TargetRecord): TargetRecord[] {
  return [record, ...records.filter((existing) => existing.id !== record.id)]
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt) || b.createdAt.localeCompare(a.createdAt));
}

export function putWeightRecord(records: WeightEntry[], record: WeightEntry): WeightEntry[] {
  return [record, ...records.filter((existing) => existing.date !== record.date)]
    .sort((a, b) => b.date.localeCompare(a.date));
}
