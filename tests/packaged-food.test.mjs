import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBarcode, packagedItem, parseOpenFoodFacts } from "../src/lib/packaged-food.ts";
import { itemAmountLabel, nutrientsFor, total } from "../src/lib/food.ts";
import { summarizeWeek } from "../src/lib/weekly-progress.ts";

test("barcode input accepts checked retail codes and rejects URLs or wrong check digits", () => {
  assert.equal(normalizeBarcode("3017 6204 22003"), "3017620422003");
  assert.equal(normalizeBarcode("036000291452"), "036000291452");
  assert.equal(normalizeBarcode("96385074"), "96385074");
  assert.equal(normalizeBarcode("04252614"), "04252614");
  assert.equal(normalizeBarcode("3017620422004"), null);
  assert.equal(normalizeBarcode("https://example.com/3017620422003"), null);
});

test("liquid product keeps ml basis and its missing nutrient stays unknown", () => {
  const result = parseOpenFoodFacts({ product: { product_name: "Jus contoh", brands: "Merek", quantity: "250 ml", product_quantity_unit: "ml", serving_size: "125 ml", nutriments: { "energy-kcal_100g": 40, proteins_100g: 0.5, carbohydrates_100g: 9 } } }, "3017620422003", "2026-10-12T00:00:00Z");
  assert.equal(result.status, "incomplete");
  if (result.status === "not_found") return;
  assert.deepEqual(result.product.basis, { amount: 100, unit: "ml" });
  assert.equal(result.product.suggestedAmount, 125);
  const item = packagedItem(result.product);
  assert.equal(itemAmountLabel(item), "125 ml");
  assert.equal(nutrientsFor(item).calories, 50);
  assert.equal(nutrientsFor(item).fat, null);
  assert.equal(total([item]).fat, null);
  const meal = { id: "meal", date: "2026-10-12", type: "Camilan", title: "Jus", method: "manual", createdAt: "2026-10-12T12:00:00Z", items: [item] };
  const summary = summarizeWeek("2026-10-12", [meal], [], [], "2026-10-12");
  assert.equal(summary.days[0].calories, 50);
  assert.equal(summary.days[0].macros.fat, null);
});

test("per-serving values recalculate without interpreting a serving as grams", () => {
  const result = parseOpenFoodFacts({ product: { product_name: "Biskuit", brands: "Contoh", serving_size: "2 keping", nutrition_data_per: "serving", nutriments: { "energy-kcal_serving": 80, proteins_serving: 2, carbohydrates_serving: 10, fat_serving: 3 } } }, "3017620422003", "2026-10-12T00:00:00Z");
  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  const item = packagedItem(result.product, 2);
  assert.equal(item.packaged.basis.unit, "serving");
  assert.equal(itemAmountLabel(item), "2 sajian");
  assert.equal(nutrientsFor(item).calories, 160);
  assert.equal(nutrientsFor(item).carbs, 20);
});

test("provider response with a different barcode is not accepted as a match", () => {
  assert.deepEqual(parseOpenFoodFacts({ product: { code: "036000291452", product_name: "Produk lain" } }, "3017620422003", "2026-10-12T00:00:00Z"), { status: "not_found" });
});

test("lookup without a reliable mass or volume unit is marked incomplete", () => {
  const result = parseOpenFoodFacts({ product: { product_name: "Minuman", nutriments: { "energy-kcal_100g": 50 } } }, "3017620422003", "2026-10-12T00:00:00Z");
  assert.equal(result.status, "incomplete");
  if (result.status === "incomplete") assert.equal(result.product.basisKnown, false);
});
