import type { Profile, WeightEntry } from "./food";

export const FORMULA_VERSION = "mifflin-st-jeor-v1";
export type TargetSource = "calculated" | "manual";
export type TargetInputs = Pick<Profile, "age" | "height" | "weight" | "sex" | "activity" | "goal"> & {
  bmr: number;
  activityMultiplier: number;
  goalAdjustment: number;
  unitSystem: "metric";
};
export type TargetEstimate = { calories: number; inputs: TargetInputs; formulaVersion: typeof FORMULA_VERSION };
export type TargetRecord = {
  id: string;
  calories: number;
  source: TargetSource;
  formulaVersion: string | null;
  inputs: TargetInputs | null;
  effectiveAt: string;
  createdAt: string;
  note: string;
};

export function profileError(profile: Profile): string | null {
  if (profile.name.trim().length > 80) return "Nama panggilan maksimal 80 karakter.";
  if (!Number.isInteger(profile.age) || profile.age < 18 || profile.age > 120) return "Usia harus antara 18–120 tahun.";
  if (!Number.isFinite(profile.height) || profile.height < 100 || profile.height > 250) return "Tinggi harus antara 100–250 cm.";
  if (!Number.isFinite(profile.weight) || profile.weight < 20 || profile.weight > 400) return "Berat harus antara 20–400 kg.";
  if (!["pria", "wanita", "tidak_menyebutkan"].includes(profile.sex)) return "Pilih parameter rumus dasar.";
  if (!["rendah", "ringan", "sedang", "tinggi"].includes(profile.activity)) return "Pilih tingkat aktivitas.";
  if (!["turun", "jaga", "naik"].includes(profile.goal)) return "Pilih tujuan.";
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
