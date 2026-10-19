// Exercise search for the picker. Runs on the client over the whole catalog (~100 items),
// so it works offline and updates on every keystroke.

/** Lowercase, `ё` → `е`, collapsed whitespace. */
export const normalizeSearchText = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

export interface SearchableExercise {
  nameRu: string;
  nameEn: string | null;
}

/**
 * Exercises whose Russian or English name contains every word of the query, in any order.
 * Names starting with the query come first; otherwise the input order is kept.
 */
export function searchExercises<T extends SearchableExercise>(
  items: readonly T[],
  query: string,
): T[] {
  const q = normalizeSearchText(query);
  if (!q) return [...items];
  const words = q.split(' ');

  const scored: { item: T; prefix: boolean }[] = [];
  for (const item of items) {
    const names = [item.nameRu, item.nameEn ?? ''].map(normalizeSearchText);
    const haystack = names.join(' ');
    if (!words.every((w) => haystack.includes(w))) continue;
    scored.push({ item, prefix: names.some((n) => n.startsWith(q)) });
  }
  // Array#sort is stable: ties keep the input order.
  return scored.sort((a, b) => Number(b.prefix) - Number(a.prefix)).map((s) => s.item);
}
