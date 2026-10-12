import test from "node:test";
import assert from "node:assert/strict";
import { photoReviewState } from "../src/lib/photo-review.ts";
import { searchPhotoFoods } from "../src/lib/food.ts";

const item = (id) => ({ id, foodId: null, name: id, quantity: 50, unit: "gram", gramsPerUnit: 1, grams: 50, per100g: { calories: 100, protein: 2, carbs: 20, fat: 1 }, source: "Tes", corrected: true });

test("unmatched scan candidates remain distinct from intentionally ignored candidates", () => {
  const draft = [item("rice"), item("soup"), item("cucumber")];
  const selections = { 0: "rice", 1: "soup" };
  const extras = { 1: ["cucumber"] };
  const pending = photoReviewState(3, selections, [], draft, extras);
  assert.deepEqual(pending.unresolved, [2]);
  assert.deepEqual(pending.included.map((entry) => entry.id), ["rice", "soup", "cucumber"]);

  const ignored = photoReviewState(3, selections, [1, 2], draft, extras);
  assert.deepEqual(ignored.unresolved, []);
  assert.deepEqual(ignored.included.map((entry) => entry.id), ["rice"]);
  assert.equal(ignored.ignored, 2);
});

test("manual extras count without being assigned to an AI candidate", () => {
  const review = photoReviewState(1, {}, [0], [item("tomato")]);
  assert.deepEqual(review.included.map((entry) => entry.id), ["tomato"]);
});

test("a selected item with an invalid portion stays out of the total until corrected", () => {
  const invalid = { ...item("soup"), grams: 0 };
  const review = photoReviewState(1, { 0: "soup" }, [], [invalid]);
  assert.deepEqual(review.unresolved, []);
  assert.deepEqual(review.included, []);
  assert.deepEqual(review.invalid.map((entry) => entry.id), ["soup"]);
});

test("photo matching shows relevant results and a genuinely empty state", () => {
  assert.ok(searchPhotoFoods("tempe").some((food) => food.name.toLowerCase().includes("tempe")));
  assert.deepEqual(searchPhotoFoods("makanan-yang-tidak-ada-12345"), []);
});
