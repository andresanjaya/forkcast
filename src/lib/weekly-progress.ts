import { nutrientsFor, type Meal, type Nutrients, type WeightEntry } from "./food.ts";
import type { TargetRecord } from "./target";

export const WEEKLY_TIME_ZONE = "Asia/Makassar";
export type Macro = "protein" | "carbs" | "fat";
export type WeeklyDay = {
  date: string;
  mealCount: number;
  calories: number | null;
  macros: Record<Macro, number | null>;
  target: number | null;
  comparison: "below" | "at" | "above" | null;
};
export type WeeklySummary = {
  start: string;
  end: string;
  days: WeeklyDay[];
  loggedDays: number;
  mealCount: number;
  calorieDays: number;
  averageCalories: number | null;
  comparableDays: number;
  comparisonCounts: { below: number; at: number; above: number };
  averageTargetDifference: number | null;
  macroAverages: Record<Macro, { value: number | null; days: number }>;
  incompleteNutrition: boolean;
  weightEntries: WeightEntry[];
  weightChange: { first: WeightEntry; latest: WeightEntry; difference: number } | null;
  insights: string[];
};

function dateParts(date: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Tanggal tidak valid.");
  const parts: [number, number, number] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (parsed.toISOString().slice(0, 10) !== date) throw new Error("Tanggal tidak valid.");
  return parts;
}

export function addCalendarDays(date: string, amount: number): string {
  const [year, month, day] = dateParts(date);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
}

export function mondayOf(date: string): string {
  const [year, month, day] = dateParts(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addCalendarDays(date, -(weekday === 0 ? 6 : weekday - 1));
}

export function mealLoggingStreak(meals: Meal[], todayDate = todayInTimeZone()): number {
  const loggedDates = new Set(meals.filter((meal) => meal.items.length > 0 && meal.date <= todayDate).map((meal) => meal.date));
  let date = loggedDates.has(todayDate) ? todayDate : addCalendarDays(todayDate, -1);
  if (!loggedDates.has(date)) return 0;
  let days = 0;
  while (loggedDates.has(date)) { days += 1; date = addCalendarDays(date, -1); }
  return days;
}

export function todayInTimeZone(now = new Date(), timeZone = WEEKLY_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatWeeklyDate(date: string, options: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = dateParts(date);
  return new Intl.DateTimeFormat("id-ID", { ...options, timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function weeklyRangeLabel(start: string): string {
  const end = addCalendarDays(start, 6);
  const a = formatWeeklyDate(start, { day: "numeric", month: "short", year: "numeric" });
  const b = formatWeeklyDate(end, { day: "numeric", month: "short", year: "numeric" });
  const [ay, am] = start.split("-");
  const [by, bm] = end.split("-");
  return ay === by && am === bm ? `${formatWeeklyDate(start, { day: "numeric" })}–${b}` : ay === by ? `${formatWeeklyDate(start, { day: "numeric", month: "short" })}–${b}` : `${a}–${b}`;
}

// The app has no timezone setting yet. Asia/Makassar is UTC+08:00 year-round.
// A target becomes comparable on a date when it existed before that local date ended.
export function targetOnDate(date: string, targets: TargetRecord[]): number | null {
  const [year, month, day] = dateParts(date);
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1, -8);
  const active = targets.filter((entry) => {
    const at = Date.parse(entry.effectiveAt);
    return Number.isFinite(at) && at < nextMidnightUtc && Number.isFinite(entry.calories) && entry.calories > 0;
  }).sort((a, b) => Date.parse(b.effectiveAt) - Date.parse(a.effectiveAt) || Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  return active?.calories ?? null;
}

function nutrient(item: Meal["items"][number], key: keyof Nutrients): number | null {
  const value = nutrientsFor(item)[key];
  if (!Number.isFinite(item.grams) || item.grams < 0 || !Number.isFinite(value) || value === null || value < 0) return null;
  return value;
}

function sumValid(items: Meal["items"], key: keyof Nutrients): number | null {
  const values = items.map((item) => nutrient(item, key));
  return values.some((value) => value === null) ? null : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function summarizeWeek(start: string, meals: Meal[], targets: TargetRecord[], weights: WeightEntry[], todayDate = todayInTimeZone()): WeeklySummary {
  const monday = mondayOf(start);
  const days: WeeklyDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addCalendarDays(monday, index);
    const entries = date <= todayDate ? meals.filter((meal) => meal.date === date) : [];
    const items = entries.flatMap((meal) => meal.items);
    const calories = items.length ? sumValid(items, "calories") : null;
    const macros = Object.fromEntries((["protein", "carbs", "fat"] as Macro[]).map((key) => [key, items.length ? sumValid(items, key) : null])) as Record<Macro, number | null>;
    const target = date <= todayDate ? targetOnDate(date, targets) : null;
    const comparison = calories === null || target === null ? null : Math.round(calories) === target ? "at" : calories < target ? "below" : "above";
    return { date, mealCount: entries.length, calories, macros, target, comparison };
  });
  const loggedDays = days.filter((day) => day.mealCount > 0).length;
  const mealCount = days.reduce((sum, day) => sum + day.mealCount, 0);
  const calorieDays = days.filter((day) => day.calories !== null);
  const comparable = days.filter((day) => day.comparison !== null);
  const comparisonCounts = {
    below: comparable.filter((day) => day.comparison === "below").length,
    at: comparable.filter((day) => day.comparison === "at").length,
    above: comparable.filter((day) => day.comparison === "above").length,
  };
  const macroAverages = Object.fromEntries((["protein", "carbs", "fat"] as Macro[]).map((key) => {
    const valid = days.filter((day) => day.macros[key] !== null);
    return [key, { value: valid.length ? valid.reduce((sum, day) => sum + (day.macros[key] ?? 0), 0) / valid.length : null, days: valid.length }];
  })) as WeeklySummary["macroAverages"];
  const end = addCalendarDays(monday, 6);
  const weightEntries = weights.filter((entry) => entry.date >= monday && entry.date <= end && entry.date <= todayDate && Number.isFinite(entry.weight) && entry.weight >= 20 && entry.weight <= 400).sort((a, b) => a.date.localeCompare(b.date));
  const weightChange = weightEntries.length >= 2 ? { first: weightEntries[0], latest: weightEntries[weightEntries.length - 1], difference: weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight } : null;
  const insights: string[] = [];
  if (loggedDays) insights.push(`Makanan tercatat pada ${loggedDays} dari 7 hari (${mealCount} catatan makan).`);
  if (comparable.length >= 2) {
    const difference = comparable.reduce((sum, day) => sum + (day.calories ?? 0) - (day.target ?? 0), 0) / comparable.length;
    const roundedDifference = Math.round(difference);
    insights.push(roundedDifference === 0
      ? `Rata-rata kalori tercatat sekitar target pada ${comparable.length} hari dengan catatan dan target aktif.`
      : `Rata-rata kalori tercatat ${Math.abs(roundedDifference).toLocaleString("id-ID")} kkal ${roundedDifference > 0 ? "di atas" : "di bawah"} target pada ${comparable.length} hari dengan catatan dan target aktif.`);
  }
  if (weightChange) insights.push(`Berat tercatat ${weightEntries.length} kali; selisih ${Math.abs(weightChange.difference).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg antara ${formatWeeklyDate(weightChange.first.date, { day: "numeric", month: "short" })} dan ${formatWeeklyDate(weightChange.latest.date, { day: "numeric", month: "short" })}.`);
  return {
    start: monday, end, days, loggedDays, mealCount, calorieDays: calorieDays.length,
    averageCalories: calorieDays.length ? calorieDays.reduce((sum, day) => sum + (day.calories ?? 0), 0) / calorieDays.length : null,
    comparableDays: comparable.length, comparisonCounts,
    averageTargetDifference: comparable.length ? comparable.reduce((sum, day) => sum + (day.calories ?? 0) - (day.target ?? 0), 0) / comparable.length : null,
    macroAverages,
    incompleteNutrition: days.some((day) => day.mealCount > 0 && (day.calories === null || Object.values(day.macros).some((value) => value === null))),
    weightEntries, weightChange, insights,
  };
}
