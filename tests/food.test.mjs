import test from "node:test";
import assert from "node:assert/strict";
import { changeServing, editMealItem, foods, itemFromFood, matchCandidateFood, nutrientsFor, suggestedTarget, total } from "../src/lib/food.ts";

test("nutrition uses the stored snapshot and selected gram amount", () => {
  const item = itemFromFood(foods[0]);
  item.quantity = 1.5;
  item.grams = 150;
  assert.equal(nutrientsFor(item).calories, 195);
  const meal = total([item, { ...item, id: "second", grams: 50 }]);
  assert.equal(meal.calories, 260);
  assert.equal(meal.carbs, 56.4);
  assert.equal(item.source, "Data contoh untuk demo");
});

test("suggested target responds to activity and goal and respects minimum", () => {
  const base = { name: "", age: 30, height: 165, weight: 65, sex: "wanita", activity: "rendah", goal: "jaga", calorieTarget: 0 };
  const maintain = suggestedTarget(base);
  assert.ok(suggestedTarget({ ...base, activity: "sedang" }) > maintain);
  assert.ok(suggestedTarget({ ...base, goal: "turun" }) <= maintain);
  assert.ok(suggestedTarget({ ...base, weight: 25, goal: "turun" }) >= 1200);
});

test("editing one item leaves other items and original snapshots unchanged", () => {
  const rice = itemFromFood(foods[0]);
  const chicken = itemFromFood(foods[1]);
  const original = [rice, chicken];
  const edited = editMealItem(original, rice.id, { quantity: 2, grams: 200 });
  assert.equal(edited[0].corrected, true);
  assert.equal(edited[0].grams, 200);
  assert.equal(edited[1], chicken);
  assert.equal(original[0].grams, 100);
  assert.equal(total(edited).calories, 450);
  const asGrams = changeServing(edited[0], "gram");
  assert.equal(asGrams.quantity, 200);
  assert.equal(asGrams.grams, 200);
  assert.equal(nutrientsFor(asGrams).calories, 260);
});

test("AI candidates match only explicit food names or Indonesian aliases", () => {
  assert.equal(matchCandidateFood("AYAM PANGGANG")?.id, "ayam-bakar");
  assert.equal(matchCandidateFood("nasi putih")?.id, "nasi");
  assert.equal(matchCandidateFood("nasi campur"), null);
});
