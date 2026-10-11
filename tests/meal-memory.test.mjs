import test from "node:test";
import assert from "node:assert/strict";
import { copyMealItems, correctionsFromReview, findPersonalMatch, frequentFoodShortcuts, normalizeFoodKey, recentFoodShortcuts, savedMealError } from "../src/lib/meal-memory.ts";

const item = (id, foodId, name, grams = 100) => ({ id, foodId, name, quantity: 1, unit: "porsi", gramsPerUnit: grams, grams, per100g: { calories: 100, protein: 2, carbs: 20, fat: 1 }, source: "Data contoh", corrected: false });
const meal = (id, eatenAt, items) => ({ id, date: eatenAt.slice(0, 10), eatenAt, type: "Makan siang", title: id, method: "manual", items, createdAt: eatenAt });

test("recent food shortcuts use actual meal timestamps and the latest portion", () => {
  const entries = [
    meal("older", "2026-10-01T12:00:00Z", [item("rice-old", "nasi", "Nasi putih", 100)]),
    meal("newer", "2026-10-11T12:00:00Z", [item("rice-new", "nasi", "Nasi putih", 150), item("egg", "telur", "Telur rebus")]),
  ];
  const recent = recentFoodShortcuts(entries);
  assert.deepEqual(recent.map((entry) => entry.key), ["food:nasi", "food:telur"]);
  assert.equal(recent[0].item.grams, 150);
});

test("frequent foods count item occurrences in the last 30 days and ignore old or deleted logs", () => {
  const entries = [
    meal("old", "2026-08-01T12:00:00Z", [item("old-rice", "nasi", "Nasi putih")]),
    meal("first", "2026-10-10T12:00:00Z", [item("rice1", "nasi", "Nasi putih"), item("egg", "telur", "Telur rebus")]),
    meal("second", "2026-10-11T12:00:00Z", [item("rice2", "nasi", "Nasi putih", 150)]),
  ];
  const frequent = frequentFoodShortcuts(entries, { now: new Date("2026-10-12T00:00:00Z") });
  assert.equal(frequent[0].key, "food:nasi");
  assert.equal(frequent[0].count, 2);
  assert.equal(frequent[0].item.grams, 150);
  assert.equal(frequent[1].key, "food:telur");
  const afterDelete = frequentFoodShortcuts(entries.filter((entry) => entry.id !== "second"), { now: new Date("2026-10-12T00:00:00Z") });
  assert.equal(afterDelete.find((entry) => entry.key === "food:nasi").count, 1);
});

test("saved meal snapshots stay separate from diary items", () => {
  const original = [item("rice", "nasi", "Nasi putih")];
  const copied = copyMealItems(original);
  copied[0].grams = 200;
  copied[0].per100g.calories = 130;
  assert.equal(original[0].grams, 100);
  assert.equal(original[0].per100g.calories, 100);
  assert.notEqual(copied[0].id, original[0].id);
  assert.equal(savedMealError("", "", original), "Nama kombinasi harus 1–160 karakter.");
  assert.equal(savedMealError("Makan biasa", "", original), null);
});

test("personal match is exact after normalization and never fuzzy", () => {
  const corrected = { id: "1", candidateText: "ayam", candidateKey: normalizeFoodKey("Ayam Goreng"), alias: "ayam rumah", item: item("chicken", "ayam-goreng", "Ayam goreng"), createdAt: "2026-10-11T12:00:00Z" };
  const saved = { id: "saved", title: "Nasi ayam", items: [item("rice", "nasi", "Nasi putih")] };
  assert.equal(findPersonalMatch("AYAM-goreng", [corrected], [saved])?.kind, "correction");
  assert.equal(findPersonalMatch("Ayam rumah", [corrected], [saved])?.kind, "correction");
  assert.equal(findPersonalMatch("nasi ayam", [], [saved])?.kind, "saved");
  assert.equal(findPersonalMatch("ayam goreng sambal", [corrected], [saved]), null);
});

test("review stores only explicit corrections with candidate and selected snapshot", () => {
  const unchanged = item("same", "nasi", "Nasi putih");
  const changed = { ...item("different", "ayam-bakar", "Ayam bakar", 150), corrected: true };
  const records = correctionsFromReview(
    [{ candidateName: "nasi putih" }, { candidateName: "ayam goreng" }],
    { 0: "same", 1: "different" }, { 0: "nasi", 1: "ayam-goreng" }, { 1: "ayam rumah" },
    [unchanged, changed], "2026-10-12T00:00:00Z",
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].candidateKey, "ayam goreng");
  assert.equal(records[0].alias, "ayam rumah");
  assert.equal(records[0].item.grams, 150);
});
