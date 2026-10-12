import { zero, type MealItem, type OptionalNutrients, type PackagedSnapshot } from "./food.ts";

export type PackagedProduct = PackagedSnapshot & { name: string; suggestedAmount: number; basisKnown?: boolean };
export type UserProduct = { id: string; product: PackagedProduct; updatedAt: string };
export type LookupResult = { status: "found" | "incomplete"; product: PackagedProduct } | { status: "not_found" };

function checkDigit(digits: string): boolean {
  const body = digits.slice(0, -1);
  const sum = [...body].reverse().reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(digits.at(-1));
}
function expandUpcE(code: string): string {
  const [system, a, b, c, d, e, f, check] = code.split("");
  const body = Number(f) <= 2 ? `${system}${a}${b}${f}0000${c}${d}${e}`
    : f === "3" ? `${system}${a}${b}${c}00000${d}${e}`
      : f === "4" ? `${system}${a}${b}${c}${d}00000${e}` : `${system}${a}${b}${c}${d}${e}0000${f}`;
  return `${body}${check}`;
}
export function normalizeBarcode(value: string): string | null {
  const code = value.replace(/[\s-]/g, "");
  if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(code)) return null;
  if (code.length === 8) return checkDigit(code) || /^[01]/.test(code) && checkDigit(expandUpcE(code)) ? code : null;
  return checkDigit(code) ? code : null;
}

const cleanText = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const nutrient = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100000 ? value : null;
const servingAmount = (value: string, unit: "g" | "ml") => {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(g|gr|gram|ml)\b/i.exec(value);
  return match && (unit === "g" ? /^(g|gr|gram)$/i : /^ml$/i).test(match[2]) ? Number(match[1].replace(",", ".")) : null;
};

export function parseOpenFoodFacts(data: unknown, code: string, lookedUpAt: string): LookupResult {
  const response = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const raw = response.product && typeof response.product === "object" ? response.product as Record<string, unknown> : null;
  if (!raw) return { status: "not_found" };
  const returnedCode = cleanText(raw.code, 14);
  if (returnedCode && returnedCode.padStart(13, "0") !== code.padStart(13, "0")) return { status: "not_found" };
  const facts = raw.nutriments && typeof raw.nutriments === "object" ? raw.nutriments as Record<string, unknown> : {};
  const name = cleanText(raw.product_name_id, 160) || cleanText(raw.product_name, 160) || cleanText(raw.product_name_en, 160);
  const brand = cleanText(raw.brands, 120);
  const packageQuantity = cleanText(raw.quantity, 80);
  const servingSize = cleanText(raw.serving_size, 80);
  const unit: "g" | "ml" | null = raw.product_quantity_unit === "ml" ? "ml" : raw.product_quantity_unit === "g" ? "g" : null;
  const useServing = raw.nutrition_data_per === "serving" && ["energy-kcal_serving", "proteins_serving", "carbohydrates_serving", "fat_serving"].some((key) => nutrient(facts[key]) !== null);
  const basis = useServing ? { amount: 1, unit: "serving" as const } : unit ? { amount: 100, unit } : null;
  const suffix = useServing ? "_serving" : "_100g";
  const nutrients: OptionalNutrients = {
    calories: nutrient(facts[`energy-kcal${suffix}`]), protein: nutrient(facts[`proteins${suffix}`]),
    carbs: nutrient(facts[`carbohydrates${suffix}`]), fat: nutrient(facts[`fat${suffix}`]),
  };
  const suggestedAmount = basis?.unit === "serving" ? 1 : basis ? servingAmount(servingSize, basis.unit) ?? 100 : 1;
  const product: PackagedProduct = {
    name, barcode: code, brand, packageQuantity, servingSize,
    basis: basis ?? { amount: 1, unit: "serving" }, nutrients,
    provider: "Open Food Facts", sourceUrl: `https://world.openfoodfacts.org/product/${code}`,
    lookedUpAt, note: "Cocokkan nama, varian, dan label gizi dengan kemasan di tanganmu.", suggestedAmount, userEdited: false, basisKnown: Boolean(basis),
  };
  const usable = Boolean(name && basis && Object.values(nutrients).some((value) => value !== null));
  return { status: usable && Object.values(nutrients).every((value) => value !== null) ? "found" : "incomplete", product };
}

export function packagedItem(product: PackagedProduct, amount = product.suggestedAmount): MealItem {
  return { id: crypto.randomUUID(), foodId: product.barcode ? `barcode:${product.barcode}` : null,
    name: [product.brand, product.name].filter(Boolean).join(" · ").slice(0, 160), quantity: amount,
    unit: product.basis.unit === "serving" ? "sajian" : product.basis.unit,
    gramsPerUnit: 1, grams: amount, per100g: { ...zero },
    source: product.provider === "Open Food Facts" ? `Open Food Facts${product.userEdited ? " (dikoreksi pengguna)" : ""} · ${product.barcode} · ${product.lookedUpAt}` : "Diisi pengguna dari label kemasan",
    corrected: product.provider !== "Open Food Facts" || Boolean(product.userEdited), packaged: { barcode: product.barcode, brand: product.brand,
      packageQuantity: product.packageQuantity, servingSize: product.servingSize, basis: { ...product.basis },
      nutrients: { ...product.nutrients }, provider: product.provider, sourceUrl: product.sourceUrl,
      lookedUpAt: product.lookedUpAt, note: product.note, userEdited: product.userEdited },
  };
}
