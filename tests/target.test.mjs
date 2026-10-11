import test from "node:test";
import assert from "node:assert/strict";
import { activeTarget, addTargetRecord, estimateTarget, profileError, putWeightRecord, validTarget } from "../src/lib/target.ts";

const profile = { name: "", age: 30, height: 170, weight: 70, sex: "pria", activity: "rendah", goal: "jaga", calorieTarget: 2000 };

test("Mifflin–St Jeor uses both coefficients and rounds once to ten calories", () => {
  const male = estimateTarget(profile);
  const female = estimateTarget({ ...profile, sex: "wanita" });
  assert.equal(male.inputs.bmr, 1617.5);
  assert.equal(male.calories, 1940);
  assert.equal(female.inputs.bmr, 1451.5);
  assert.equal(female.calories, 1740);
  assert.equal(male.formulaVersion, "mifflin-st-jeor-v1");
});

test("activity and goal changes affect suggestions but never the active target", () => {
  const higher = estimateTarget({ ...profile, activity: "tinggi", goal: "naik" });
  const lower = estimateTarget({ ...profile, goal: "turun" });
  assert.ok(higher.calories > estimateTarget(profile).calories);
  assert.ok(lower.calories < estimateTarget(profile).calories);
  const history = [{ id: "old", calories: 2000, source: "manual", formulaVersion: null, inputs: null, effectiveAt: "2026-10-11T00:00:00.000Z", createdAt: "2026-10-11T00:00:00.000Z", note: "" }];
  assert.equal(activeTarget(history).calories, 2000);
  assert.equal(addTargetRecord(history, { ...history[0], id: "new", calories: higher.calories, effectiveAt: "2026-10-11T01:00:00.000Z", createdAt: "2026-10-11T01:00:00.000Z" }).length, 2);
});

test("prefer not to say and invalid inputs require a manual target", () => {
  assert.equal(estimateTarget({ ...profile, sex: "tidak_menyebutkan" }), null);
  assert.equal(estimateTarget({ ...profile, age: 0 }), null);
  assert.equal(estimateTarget({ ...profile, weight: 400, height: 250, activity: "tinggi", goal: "naik" }), null);
  assert.match(profileError({ ...profile, weight: 500 }), /Berat/);
  assert.equal(validTarget(1999), true);
  assert.equal(validTarget(999.5), false);
  assert.equal(validTarget(6001), false);
});

test("same-day weight updates do not erase earlier dates", () => {
  const previous = [{ id: "older", date: "2026-10-10", weight: 70 }, { id: "today", date: "2026-10-11", weight: 69 }];
  const next = putWeightRecord(previous, { id: "replacement", date: "2026-10-11", weight: 68.5 });
  assert.equal(next.length, 2);
  assert.equal(next[0].weight, 68.5);
  assert.deepEqual(next[1], previous[0]);
});
