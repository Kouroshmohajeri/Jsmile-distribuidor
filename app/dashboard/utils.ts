import type { Counts, Entry, SaleItem } from "./types";

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(monthKey: string) {
  return new Date(`${monthKey}-01T12:00:00`).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

export function normalizeEntryItems(entry: Entry): SaleItem[] {
  if (Array.isArray(entry.items) && entry.items.length > 0) {
    return entry.items.map((item) => ({
      category: item.category,
      index: Number(item.index),
      state: item.state ?? "procesando",
    }));
  }

  const rebuilt: SaleItem[] = [];
  (Object.keys(entry.counts) as (keyof Counts)[]).forEach((category) => {
    const count = Math.max(0, Number(entry.counts[category] || 0));
    for (let index = 1; index <= count; index += 1) {
      rebuilt.push({ category, index, state: "procesando" });
    }
  });
  return rebuilt;
}

export function itemCounts(entry: Entry) {
  const items = Array.isArray(entry.items) ? entry.items : [];
  return items.reduce(
    (result, item) => {
      result[item.state][item.category] += 1;
      return result;
    },
    {
      procesando: { fibra: 0, luz: 0, gas: 0 },
      finalizado: { fibra: 0, luz: 0, gas: 0 },
      rechazado: { fibra: 0, luz: 0, gas: 0 },
    } as Record<import("./types").Status, Counts>,
  );
}

/**
 * Selecting box N means selecting every available box from 1 through N.
 * Locked saved boxes are preserved exactly as they are.
 *
 * Example:
 *   saved: 1, 2
 *   click 4
 *   => saved 1,2 + new 3,4
 *
 * Rejected/finalized boxes are never modified.
 */
export function addSequentialDraftItems(
  draftItems: SaleItem[],
  savedItems: SaleItem[],
  category: keyof Counts,
  index: number,
): SaleItem[] {
  const savedByKey = new Map(
    savedItems.map((item) => [`${item.category}:${item.index}`, item]),
  );

  const next = [...draftItems];

  for (let box = 1; box <= index; box += 1) {
    const key = `${category}:${box}`;

    // A saved box already exists. Never alter it.
    if (savedByKey.has(key)) continue;

    const alreadyInDraft = next.some(
      (item) => item.category === category && item.index === box,
    );

    if (!alreadyInDraft) {
      next.push({
        category,
        index: box,
        state: "procesando",
      });
    }
  }

  return sortItems(next);
}

export function sortItems(items: SaleItem[]) {
  return [...items].sort((a, b) => {
    const categoryOrder =
      ["fibra", "luz", "gas"].indexOf(a.category) -
      ["fibra", "luz", "gas"].indexOf(b.category);
    return categoryOrder || a.index - b.index;
  });
}

export function countsFromItems(items: SaleItem[]): Counts {
  return items.reduce<Counts>(
    (result, item) => {
      if (item.state !== "rechazado") {
        result[item.category] += 1;
      }
      return result;
    },
    { fibra: 0, luz: 0, gas: 0 },
  );
}
