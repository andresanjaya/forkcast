import type { MealItem } from "./food";

export function validPhotoItem(item: MealItem): boolean {
  const values = item.packaged?.nutrients ?? item.per100g;
  return Boolean(item.name.trim()) && Number.isFinite(item.grams) && item.grams > 0 && item.grams <= 10000
    && typeof values.calories === "number" && Number.isFinite(values.calories) && values.calories >= 0
    && Object.values(values).every((value) => value === null || Number.isFinite(value) && value >= 0);
}

export function photoReviewState(candidateCount: number, selections: Record<number, string>, ignored: number[], draft: MealItem[], extras: Record<number, string[]> = {}) {
  const ignoredSet = new Set(ignored);
  const assignedIds = new Set([...Object.values(selections), ...Object.values(extras).flat()]);
  const includedIds = new Set(
    Object.entries(selections)
      .filter(([index]) => !ignoredSet.has(Number(index)))
      .flatMap(([index, id]) => [id, ...(extras[Number(index)] ?? [])]),
  );
  const chosen = draft.filter((item) => !assignedIds.has(item.id) || includedIds.has(item.id));
  const included = chosen.filter(validPhotoItem);
  const invalid = chosen.filter((item) => !validPhotoItem(item));
  const unresolved = Array.from({ length: candidateCount }, (_, index) => index)
    .filter((index) => !ignoredSet.has(index) && !draft.some((item) => item.id === selections[index]));
  return { included, invalid, unresolved, ignored: ignoredSet.size };
}
