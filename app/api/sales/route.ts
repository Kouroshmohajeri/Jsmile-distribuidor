import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import SalesEntry, { SaleCategory, SaleStatus } from "@/lib/models/SalesEntry";

const PLANS = {
  plan1: { label: "Plan 1", fibra: 8, luz: 11, gas: 4 },
  plan2: { label: "Plan 2", fibra: 11, luz: 11, gas: 4 },
  plan3: { label: "Plan 3", fibra: 15, luz: 11, gas: 4 },
} as const;

const CATEGORIES: SaleCategory[] = ["fibra", "luz", "gas"];
const STATES: SaleStatus[] = ["procesando", "finalizado", "rechazado"];

type SaleItemData = {
  category: SaleCategory;
  index: number;
  state: SaleStatus;
};

type Counts = {
  fibra: number;
  luz: number;
  gas: number;
};

function deriveStatus(items: SaleItemData[]): SaleStatus {
  if (items.some((item) => item.state === "rechazado")) return "rechazado";

  if (items.length > 0 && items.every((item) => item.state === "finalizado")) {
    return "finalizado";
  }

  return "procesando";
}

function countsFromItems(items: SaleItemData[]): Counts {
  return items.reduce<Counts>(
    (counts, item) => {
      if (item.state !== "rechazado") {
        counts[item.category] += 1;
      }
      return counts;
    },
    { fibra: 0, luz: 0, gas: 0 },
  );
}

function getItems(entry: any): SaleItemData[] {
  if (!Array.isArray(entry?.items)) return [];

  return entry.items
    .filter(
      (item: any) =>
        CATEGORIES.includes(item?.category) &&
        Number.isInteger(Number(item?.index)) &&
        Number(item.index) >= 1 &&
        STATES.includes(item?.state),
    )
    .map((item: any) => ({
      category: item.category as SaleCategory,
      index: Number(item.index),
      state: item.state as SaleStatus,
    }));
}

function normalizeEmail(email: unknown): string {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortItems(items: SaleItemData[]): SaleItemData[] {
  return [...items].sort((a, b) => {
    const categoryOrder =
      CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);

    return categoryOrder || a.index - b.index;
  });
}

function uniqueItems(items: SaleItemData[]): SaleItemData[] {
  const map = new Map<string, SaleItemData>();

  for (const item of items) {
    map.set(`${item.category}:${item.index}`, item);
  }

  return sortItems(Array.from(map.values()));
}

function normalizedEntry(entry: any) {
  const items = getItems(entry);
  const counts = countsFromItems(items);
  const status = deriveStatus(items);
  const object =
    typeof entry.toObject === "function" ? entry.toObject() : entry;

  const totalTarget = Number(object.snapshot?.totalTarget || 0);

  return {
    ...object,
    items,
    counts,
    status,
    snapshot: {
      ...object.snapshot,
      counts,
      totalDone: counts.fibra + counts.luz + counts.gas,
      totalPct: totalTarget
        ? Math.round(
            ((counts.fibra + counts.luz + counts.gas) / totalTarget) * 100,
          )
        : 0,
    },
  };
}

/**
 * Finds the one monthly document.
 *
 * IMPORTANT:
 * The database has a UNIQUE index on:
 *   userEmail + monthKey
 *
 * Therefore this is the identity we use for saving.
 * userId is only used as a legacy fallback.
 */
async function findMonthlyEntry(
  userId: string,
  userEmail: string,
  monthKey: string,
) {
  const normalizedEmail = normalizeEmail(userEmail);

  return SalesEntry.findOne({
    monthKey,
    $or: [
      { userEmail: normalizedEmail },
      {
        userEmail: {
          $regex: `^${escapeRegex(normalizedEmail)}$`,
          $options: "i",
        },
      },
      { userId },
    ],
  }).sort({ updatedAt: -1, createdAt: -1 });
}

export async function GET() {
  const user = await requireUser();
  await dbConnect();

  const userEmail = normalizeEmail(user.email);

  const entries = await SalesEntry.find({
    $or: [
      { userId: user.clerkId },
      { userEmail },
      {
        userEmail: {
          $regex: `^${escapeRegex(userEmail)}$`,
          $options: "i",
        },
      },
    ],
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const seenMonths = new Set<string>();

  const uniqueEntries = entries.filter((entry: any) => {
    if (seenMonths.has(entry.monthKey)) return false;

    seenMonths.add(entry.monthKey);
    return true;
  });

  return NextResponse.json(uniqueEntries.map(normalizedEntry));
}

export async function POST(request: Request) {
  const user = await requireUser();
  await dbConnect();

  const body = await request.json();

  const planId = body.planId as keyof typeof PLANS | "custom";
  const monthKey = String(body.monthKey || "").trim();
  const userEmail = normalizeEmail(user.email);
  const name = String(body.name || user.name || "").trim();

  console.log(
    "🔥 SALES SAVE:",
    JSON.stringify({
      userId: user.clerkId,
      userEmail,
      monthKey,
      planId,
    }),
  );

  if (!userEmail) {
    return NextResponse.json(
      { error: "El usuario no tiene un email válido." },
      { status: 400 },
    );
  }

  if (!["plan1", "plan2", "plan3", "custom"].includes(planId)) {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return NextResponse.json({ error: "Mes no válido" }, { status: 400 });
  }

  const rawCounts: Counts = {
    fibra: Math.max(0, Number(body.counts?.fibra || 0)),
    luz: Math.max(0, Number(body.counts?.luz || 0)),
    gas: Math.max(0, Number(body.counts?.gas || 0)),
  };

  const requestedTargets =
    planId === "custom"
      ? {
          fibra: Math.max(8, Number(body.customTargets?.fibra || 8)),
          luz: Math.max(11, Number(body.customTargets?.luz || 11)),
          gas: Math.max(4, Number(body.customTargets?.gas || 4)),
        }
      : PLANS[planId];

  /*
   * FIRST: load the existing monthly record.
   *
   * We deliberately search by the SAME identity as the unique Mongo index:
   *
   *   userEmail + monthKey
   *
   * If this finds a document, we UPDATE IT.
   * We do NOT create another SalesEntry.
   */
  let existingEntry = await findMonthlyEntry(user.clerkId, userEmail, monthKey);

  console.log(
    "🔥 EXISTING MONTHLY ENTRY:",
    existingEntry
      ? {
          id: String(existingEntry._id),
          userEmail: existingEntry.userEmail,
          monthKey: existingEntry.monthKey,
          itemCount: getItems(existingEntry).length,
        }
      : "NONE",
  );

  /*
   * Existing monthly record:
   * - keep its plan/targets
   * - keep every saved item
   * - rejected/finalized items cannot be removed
   * - append only genuinely new processing boxes
   */
  if (existingEntry) {
    const existingPlanId = existingEntry.planId as
      | keyof typeof PLANS
      | "custom";

    if (existingPlanId !== planId) {
      return NextResponse.json(
        {
          error: "El plan del mes ya está establecido y no se puede cambiar.",
        },
        { status: 409 },
      );
    }

    const targets = existingEntry.snapshot.targets;
    const existingItems = getItems(existingEntry);

    const existingKeys = new Set(
      existingItems.map((item) => `${item.category}:${item.index}`),
    );

    const requestedItems: SaleItemData[] = Array.isArray(body.items)
      ? body.items
          .filter(
            (item: any) =>
              CATEGORIES.includes(item?.category) &&
              Number.isInteger(Number(item?.index)) &&
              Number(item.index) >= 1 &&
              item?.state === "procesando",
          )
          .map((item: any) => ({
            category: item.category as SaleCategory,
            index: Number(item.index),
            state: "procesando" as SaleStatus,
          }))
      : CATEGORIES.flatMap((category) =>
          Array.from({ length: rawCounts[category] }, (_, index) => ({
            category,
            index: index + 1,
            state: "procesando" as SaleStatus,
          })),
        );

    const newItems = requestedItems.filter(
      (item) => !existingKeys.has(`${item.category}:${item.index}`),
    );

    const items = uniqueItems([...existingItems, ...newItems]);
    const counts = countsFromItems(items);
    const totalDone = counts.fibra + counts.luz + counts.gas;
    const totalTarget =
      Number(targets.fibra) + Number(targets.luz) + Number(targets.gas);

    if (totalDone === 0) {
      return NextResponse.json(
        { error: "Registra al menos una venta antes de guardar." },
        { status: 400 },
      );
    }

    existingEntry.userId = user.clerkId;
    existingEntry.userEmail = userEmail;
    existingEntry.items = items as typeof existingEntry.items;
    existingEntry.counts = counts;
    existingEntry.status = deriveStatus(items);
    existingEntry.snapshot.counts = counts;
    existingEntry.snapshot.totalDone = totalDone;
    existingEntry.snapshot.totalPct = totalTarget
      ? Math.round((totalDone / totalTarget) * 100)
      : 0;

    await existingEntry.save();

    console.log(
      "✅ SALES UPDATED:",
      String(existingEntry._id),
      "items:",
      items.length,
    );

    return NextResponse.json(normalizedEntry(existingEntry));
  }

  /*
   * There is no record visible to the normal lookup.
   *
   * DO NOT call SalesEntry.create() here.
   *
   * Instead, use findOneAndUpdate + upsert against the UNIQUE monthly key.
   * This makes the INSERT itself atomic with respect to:
   *
   *   userEmail + monthKey
   *
   * If another request creates it at the same time, Mongo's unique index
   * guarantees that we don't create a second monthly record.
   */
  const targets = requestedTargets;

  const requestedItems: SaleItemData[] = Array.isArray(body.items)
    ? body.items
        .filter(
          (item: any) =>
            CATEGORIES.includes(item?.category) &&
            Number.isInteger(Number(item?.index)) &&
            Number(item.index) >= 1 &&
            item?.state === "procesando",
        )
        .map((item: any) => ({
          category: item.category as SaleCategory,
          index: Number(item.index),
          state: "procesando" as SaleStatus,
        }))
    : CATEGORIES.flatMap((category) =>
        Array.from({ length: rawCounts[category] }, (_, index) => ({
          category,
          index: index + 1,
          state: "procesando" as SaleStatus,
        })),
      );

  const items = uniqueItems(requestedItems);
  const counts = countsFromItems(items);
  const totalDone = counts.fibra + counts.luz + counts.gas;
  const totalTarget =
    Number(targets.fibra) + Number(targets.luz) + Number(targets.gas);

  if (totalDone === 0) {
    return NextResponse.json(
      { error: "Registra al menos una venta antes de guardar." },
      { status: 400 },
    );
  }

  const createdAt = new Date();
  const planLabel =
    planId === "custom" ? "Plan Personalizado" : PLANS[planId].label;

  const newEntryData = {
    userId: user.clerkId,
    userEmail,
    monthKey,
    planId,
    customTargets: planId === "custom" ? targets : undefined,
    items,
    counts,
    status: deriveStatus(items),
    snapshot: {
      name,
      monthKey,
      planId,
      planLabel,
      targets,
      counts,
      totalDone,
      totalTarget,
      totalPct: totalTarget ? Math.round((totalDone / totalTarget) * 100) : 0,
      createdAtLabel: createdAt.toLocaleString("es-ES"),
      comisionModel: user.comisionModel,
    },
  };

  /*
   * ATOMIC CREATION.
   *
   * This is the only place a monthly document can be born.
   * There is NO SalesEntry.create() anymore.
   */
  try {
    const entry = await SalesEntry.findOneAndUpdate(
      {
        userEmail,
        monthKey,
      },
      {
        $setOnInsert: newEntryData,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    if (!entry) {
      return NextResponse.json(
        { error: "No se pudo crear el registro mensual." },
        { status: 500 },
      );
    }

    /*
     * If findOneAndUpdate found an existing record, merge the submitted
     * boxes into it. This handles the case where the document appeared
     * between our first lookup and the atomic operation.
     */
    const existingAfterUpsert = getItems(entry);

    if (
      existingAfterUpsert.length !== items.length ||
      existingAfterUpsert.some(
        (item, index) =>
          item.category !== items[index]?.category ||
          item.index !== items[index]?.index ||
          item.state !== items[index]?.state,
      )
    ) {
      const existingKeys = new Set(
        existingAfterUpsert.map((item) => `${item.category}:${item.index}`),
      );

      const mergedItems = uniqueItems([
        ...existingAfterUpsert,
        ...items.filter(
          (item) => !existingKeys.has(`${item.category}:${item.index}`),
        ),
      ]);

      const mergedCounts = countsFromItems(mergedItems);
      const mergedTotalDone =
        mergedCounts.fibra + mergedCounts.luz + mergedCounts.gas;

      entry.userId = user.clerkId;
      entry.userEmail = userEmail;
      entry.items = mergedItems as typeof entry.items;
      entry.counts = mergedCounts;
      entry.status = deriveStatus(mergedItems);
      entry.snapshot.counts = mergedCounts;
      entry.snapshot.totalDone = mergedTotalDone;
      entry.snapshot.totalPct = totalTarget
        ? Math.round((mergedTotalDone / totalTarget) * 100)
        : 0;

      await entry.save();
    }

    console.log(
      "✅ SALES UPSERTED:",
      String(entry._id),
      "items:",
      getItems(entry).length,
    );

    return NextResponse.json(normalizedEntry(entry), {
      status: 200,
    });
  } catch (error: any) {
    /*
     * A unique-key error here means another request won the race.
     * Load that exact monthly record and merge the submitted sale.
     */
    if (error?.code === 11000) {
      const racedEntry = await findMonthlyEntry(
        user.clerkId,
        userEmail,
        monthKey,
      );

      if (racedEntry) {
        const currentItems = getItems(racedEntry);
        const currentKeys = new Set(
          currentItems.map((item) => `${item.category}:${item.index}`),
        );

        const mergedItems = uniqueItems([
          ...currentItems,
          ...items.filter(
            (item) => !currentKeys.has(`${item.category}:${item.index}`),
          ),
        ]);

        const mergedCounts = countsFromItems(mergedItems);
        const mergedTotalDone =
          mergedCounts.fibra + mergedCounts.luz + mergedCounts.gas;

        const existingTargets = racedEntry.snapshot.targets;
        const existingTotalTarget =
          Number(existingTargets.fibra) +
          Number(existingTargets.luz) +
          Number(existingTargets.gas);

        racedEntry.userId = user.clerkId;
        racedEntry.userEmail = userEmail;
        racedEntry.items = mergedItems as typeof racedEntry.items;
        racedEntry.counts = mergedCounts;
        racedEntry.status = deriveStatus(mergedItems);
        racedEntry.snapshot.counts = mergedCounts;
        racedEntry.snapshot.totalDone = mergedTotalDone;
        racedEntry.snapshot.totalPct = existingTotalTarget
          ? Math.round((mergedTotalDone / existingTotalTarget) * 100)
          : 0;

        await racedEntry.save();

        console.log(
          "✅ SALES DUPLICATE RACE RECOVERED:",
          String(racedEntry._id),
        );

        return NextResponse.json(normalizedEntry(racedEntry), {
          status: 200,
        });
      }
    }

    console.error("❌ POST /api/sales failed:", error);

    return NextResponse.json(
      {
        error: "No se pudo guardar el registro mensual.",
      },
      { status: 500 },
    );
  }
}
