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

type Counts = { fibra: number; luz: number; gas: number };

function deriveStatus(items: { state: SaleStatus }[]): SaleStatus {
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

async function findMonthlyEntry(
  userId: string,
  userEmail: string,
  monthKey: string,
) {
  const normalizedEmail = userEmail.trim().toLowerCase();

  // Email is the unique identity for a monthly record. The case-insensitive
  // lookup also repairs legacy records whose email was stored with different
  // casing.
  return SalesEntry.findOne({
    monthKey,
    $or: [
      { userId },
      { userEmail: normalizedEmail },
      {
        userEmail: {
          $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}$`,
          $options: "i",
        },
      },
    ],
  }).sort({ updatedAt: -1, createdAt: -1 });
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

export async function GET() {
  const user = await requireUser();
  await dbConnect();

  const entries = await SalesEntry.find({
    $or: [{ userId: user.clerkId }, { userEmail: user.email }],
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  // The unique index is userEmail + monthKey. If legacy data has the same
  // month under different userIds, return only the newest record per month.
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
  const monthKey = String(body.monthKey || "");
  const userEmail = String(user.email || "")
    .trim()
    .toLowerCase();
  const name = String(body.name || user.name || "").trim();

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

  const existingEntry = await findMonthlyEntry(
    user.clerkId,
    userEmail,
    monthKey,
  );

  // Once a month has an entry, its plan/targets are fixed for that month.
  const targets = existingEntry?.snapshot?.targets ?? requestedTargets;
  const existingPlanId = existingEntry?.planId as
    | keyof typeof PLANS
    | "custom"
    | undefined;

  if (existingEntry && existingPlanId !== planId) {
    return NextResponse.json(
      { error: "El plan del mes ya está establecido y no se puede cambiar." },
      { status: 409 },
    );
  }

  const counts: Counts = {
    fibra: rawCounts.fibra,
    luz: rawCounts.luz,
    gas: rawCounts.gas,
  };

  const existingItems = existingEntry ? getItems(existingEntry) : [];
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
        Array.from({ length: counts[category] }, (_, index) => ({
          category,
          index: index + 1,
          state: "procesando" as SaleStatus,
        })),
      );

  // Only genuinely new boxes are appended. Existing saved boxes, including
  // rejected boxes, are never removed or overwritten by a distributor save.
  const requestedNewItems = requestedItems.filter(
    (item) => !existingKeys.has(`${item.category}:${item.index}`),
  );

  const items = [...existingItems, ...requestedNewItems].sort((a, b) => {
    const categoryOrder =
      CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
    return categoryOrder || a.index - b.index;
  });

  const finalCounts = countsFromItems(items);
  const totalDone = finalCounts.fibra + finalCounts.luz + finalCounts.gas;
  const totalTarget =
    Number(targets.fibra) + Number(targets.luz) + Number(targets.gas);

  if (totalDone === 0) {
    return NextResponse.json(
      { error: "Registra al menos una venta antes de guardar." },
      { status: 400 },
    );
  }

  if (existingEntry) {
    // One SalesEntry is kept for the entire month. Saving again only adds
    // newly selected sales; it never creates another monthly snapshot.
    existingEntry.userId = user.clerkId;
    existingEntry.userEmail = userEmail;
    existingEntry.items = items as typeof existingEntry.items;
    existingEntry.counts = finalCounts;
    existingEntry.status = deriveStatus(items);
    existingEntry.snapshot.counts = finalCounts;
    existingEntry.snapshot.totalDone = totalDone;
    existingEntry.snapshot.totalPct = totalTarget
      ? Math.round((totalDone / totalTarget) * 100)
      : 0;

    await existingEntry.save();
    return NextResponse.json(normalizedEntry(existingEntry));
  }

  const createdAt = new Date();
  const planLabel =
    planId === "custom" ? "Plan Personalizado" : PLANS[planId].label;
  const status = deriveStatus(items);

  const entryData = {
    userId: user.clerkId,
    userEmail,
    monthKey,
    planId,
    customTargets: planId === "custom" ? targets : undefined,
    items,
    counts: finalCounts,
    status,
    snapshot: {
      name,
      monthKey,
      planId,
      planLabel,
      targets,
      counts: finalCounts,
      totalDone,
      totalTarget,
      totalPct: totalTarget ? Math.round((totalDone / totalTarget) * 100) : 0,
      createdAtLabel: createdAt.toLocaleString("es-ES"),
      comisionModel: user.comisionModel,
    },
  };

  try {
    const entry = await SalesEntry.create(entryData);
    return NextResponse.json(normalizedEntry(entry), { status: 201 });
  } catch (error: any) {
    if (error?.code !== 11000) {
      console.error("POST /api/sales failed:", error);
      return NextResponse.json(
        { error: "No se pudo guardar el registro." },
        { status: 500 },
      );
    }

    // The unique index is (userEmail, monthKey). Another request may have
    // inserted the monthly record after our initial lookup. Find it again
    // using a case-insensitive email match, then merge into that record.
    const racedEntry = await findMonthlyEntry(
      user.clerkId,
      userEmail,
      monthKey,
    );

    if (!racedEntry) {
      console.error(
        "Duplicate monthly SalesEntry exists but could not be loaded.",
        {
          userEmail,
          monthKey,
          mongoError: error,
        },
      );

      return NextResponse.json(
        {
          error:
            "Ya existe un registro para este usuario y mes, pero no se pudo localizar para actualizarlo. Revisa userEmail/monthKey en MongoDB.",
        },
        { status: 409 },
      );
    }

    const racedItems = getItems(racedEntry);
    const racedKeys = new Set(
      racedItems.map((item) => `${item.category}:${item.index}`),
    );

    const mergedItems = [
      ...racedItems,
      ...items.filter(
        (item) => !racedKeys.has(`${item.category}:${item.index}`),
      ),
    ].sort((a, b) => {
      const categoryOrder =
        CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
      return categoryOrder || a.index - b.index;
    });

    const mergedCounts = countsFromItems(mergedItems);
    const mergedTotalDone =
      mergedCounts.fibra + mergedCounts.luz + mergedCounts.gas;

    racedEntry.userId = user.clerkId;
    racedEntry.userEmail = userEmail;
    racedEntry.items = mergedItems as typeof racedEntry.items;
    racedEntry.counts = mergedCounts;
    racedEntry.status = deriveStatus(mergedItems);
    racedEntry.snapshot.counts = mergedCounts;
    racedEntry.snapshot.totalDone = mergedTotalDone;
    racedEntry.snapshot.totalPct = totalTarget
      ? Math.round((mergedTotalDone / totalTarget) * 100)
      : 0;

    await racedEntry.save();

    return NextResponse.json(normalizedEntry(racedEntry));
  }
}
