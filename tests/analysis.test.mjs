import test from "node:test";
import assert from "node:assert/strict";
import { AnalysisSchema, imageType } from "../src/lib/analysis.ts";

const valid = {
  items: [{ candidateName: "Nasi putih", estimatedServing: { value: 1, unit: "centong", gramsMin: 100, gramsMax: 150 }, visibleNotes: "Terlihat nasi", confidence: "medium", needsConfirmation: true }],
  disclaimer: "Perkiraan dari foto; periksa sebelum menyimpan.",
};

test("accepts a bounded candidate response and rejects unsupported precision", () => {
  assert.equal(AnalysisSchema.parse(valid).items[0].estimatedServing.gramsMax, 150);
  assert.equal(AnalysisSchema.safeParse({ ...valid, items: [{ ...valid.items[0], estimatedServing: { ...valid.items[0].estimatedServing, gramsMin: 200 } }] }).success, false);
  assert.equal(AnalysisSchema.safeParse({ ...valid, items: [{ ...valid.items[0], calories: 210 }] }).success, false);
  assert.equal(AnalysisSchema.safeParse({ ...valid, items: [] }).success, false);
});

test("checks image bytes rather than trusting the declared MIME type", () => {
  assert.equal(imageType(Uint8Array.from([0xff, 0xd8, 0xff])), "image/jpeg");
  assert.equal(imageType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(imageType(new TextEncoder().encode("not an image")), null);
});
