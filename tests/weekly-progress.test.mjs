import test from "node:test";
import assert from "node:assert/strict";
import { addCalendarDays, mondayOf, summarizeWeek, todayInTimeZone, weeklyRangeLabel } from "../src/lib/weekly-progress.ts";

const item = (id, calories = 100, protein = 10) => ({ id, foodId: null, name: id, quantity: 1, unit: "porsi", gramsPerUnit: 100, grams: 100, per100g: { calories, protein, carbs: 20, fat: 5 }, source: "Tes", corrected: false });
const meal = (id, date, items = [item(id)]) => ({ id, date, eatenAt: `${date}T04:00:00Z`, type: "Makan siang", title: id, method: "manual", items, createdAt: `${date}T04:00:00Z` });
const target = (id, effectiveAt, calories) => ({ id, effectiveAt, createdAt: effectiveAt, calories, source: "manual", formulaVersion: null, inputs: null, note: "" });

test("Monday to Sunday range crosses years and Makassar midnight correctly", () => {
  assert.equal(mondayOf("2027-01-03"), "2026-12-28");
  assert.equal(addCalendarDays("2026-12-28", 6), "2027-01-03");
  assert.equal(todayInTimeZone(new Date("2026-10-11T16:01:00Z")), "2026-10-12");
  assert.match(weeklyRangeLabel("2026-12-28"), /2026.*2027/);
});

test("unlogged and future days never become zero-calorie days or enter averages", () => {
  const summary = summarizeWeek("2026-10-12", [meal("a", "2026-10-12"), meal("b", "2026-10-13", [item("b", 300)]), meal("future", "2026-10-15")], [], [], "2026-10-14");
  assert.equal(summary.loggedDays, 2);
  assert.equal(summary.mealCount, 2);
  assert.equal(summary.averageCalories, 200);
  assert.equal(summary.calorieDays, 2);
  assert.equal(summary.days[2].calories, null);
  assert.equal(summary.days[3].mealCount, 0);
  assert.equal(summary.comparableDays, 0);
});

test("historical target is selected by local day end, never backfilled", () => {
  const summary = summarizeWeek("2026-10-12", [meal("a", "2026-10-12"), meal("b", "2026-10-13"), meal("c", "2026-10-14")], [
    target("first", "2026-10-12T15:59:00Z", 100),
    target("second", "2026-10-13T16:00:00Z", 200),
  ], [], "2026-10-18");
  assert.equal(summary.days[0].target, 100);
  assert.equal(summary.days[1].target, 100);
  assert.equal(summary.days[2].target, 200);
  assert.deepEqual(summary.comparisonCounts, { below: 1, at: 2, above: 0 });
  const earlier = summarizeWeek("2026-10-05", [meal("old", "2026-10-05")], [target("new", "2026-10-12T00:00:00Z", 100)], [], "2026-10-18");
  assert.equal(earlier.comparableDays, 0);
});

test("incomplete macros exclude only affected days, with explicit denominators", () => {
  const incomplete = item("missing");
  delete incomplete.per100g.protein;
  const summary = summarizeWeek("2026-10-12", [meal("a", "2026-10-12", [incomplete]), meal("b", "2026-10-13", [item("b", 200, 20)]), meal("empty", "2026-10-14", [])], [], [], "2026-10-18");
  assert.equal(summary.loggedDays, 3);
  assert.equal(summary.averageCalories, 150);
  assert.equal(summary.calorieDays, 2);
  assert.deepEqual(summary.macroAverages.protein, { value: 20, days: 1 });
  assert.deepEqual(summary.macroAverages.carbs, { value: 20, days: 2 });
  assert.equal(summary.incompleteNutrition, true);
});

test("weight change uses first and latest valid records only, and sparse insights stay neutral", () => {
  const one = summarizeWeek("2026-10-12", [], [], [{ id: "1", date: "2026-10-12", weight: 65 }], "2026-10-18");
  assert.equal(one.weightChange, null);
  assert.deepEqual(one.insights, []);
  const two = summarizeWeek("2026-10-12", [], [], [
    { id: "latest", date: "2026-10-17", weight: 64.6 },
    { id: "first", date: "2026-10-12", weight: 65 },
    { id: "future", date: "2026-10-19", weight: 60 },
  ], "2026-10-18");
  assert.ok(Math.abs((two.weightChange?.difference ?? 0) + 0.4) < 0.000001);
  assert.equal(two.weightEntries.length, 2);
  assert.match(two.insights[0], /12 Okt.*17 Okt/);
});
