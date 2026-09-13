import { NextResponse } from "next/server";

import { requireAdmin, requireUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import SalesEntry, {
  SaleCategory,
  SaleStatus,
  type ISaleItem,
} from "@/lib/models/SalesEntry";

const STATES: SaleStatus[] = ["procesando", "finalizado", "rechazado"];
const CATEGORIES: SaleCategory[] = ["fibra", "luz", "gas"];

type Counts = { fibra: number; luz: number; gas: number };
type SaleItemData = Pick<ISaleItem, "category" | "index" | "state">;

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
      // Rejected sales do not count toward the objective/progress.
      if (item.state !== "rechazado") counts[item.category] += 1;
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  await dbConnect();

  const { id } = await context.params;
  const entry = await SalesEntry.findById(id);

  if (!entry) {
    return NextResponse.json(
      { error: "Registro no encontrado" },
      { status: 404 },
    );
  }

  await entry.deleteOne();
  return NextResponse.json({ ok: true, deletedBy: admin.email });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  await dbConnect();

  const { id } = await context.params;
  const body = await request.json();
  const entry = await SalesEntry.findById(id);

  if (!entry) {
    return NextResponse.json(
      { error: "Registro no encontrado" },
      { status: 404 },
    );
  }

  const currentItems: SaleItemData[] = getItems(entry);

  // Admin: change the state of one individual sale.
  if (user.role === "admin") {
    const category = body.category as SaleCategory;
    const index = Number(body.index);
    const state = body.state as SaleStatus;

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Categoría no válida" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(index) || index < 1) {
      return NextResponse.json(
        { error: "Número de venta no válido" },
        { status: 400 },
      );
    }

    if (!STATES.includes(state)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }

    const itemIndex = currentItems.findIndex(
      (current) => current.category === category && current.index === index,
    );

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: "Venta individual no encontrada" },
        { status: 404 },
      );
    }

    currentItems[itemIndex] = {
      ...currentItems[itemIndex],
      state,
    };

    entry.items = currentItems as typeof entry.items;
    entry.status = deriveStatus(currentItems);

    const counts = countsFromItems(currentItems);
    entry.counts = counts;
    entry.snapshot.counts = counts;
    entry.snapshot.totalDone = counts.fibra + counts.luz + counts.gas;
    entry.snapshot.totalPct = entry.snapshot.totalTarget
      ? Math.round(
          (entry.snapshot.totalDone / entry.snapshot.totalTarget) * 100,
        )
      : 0;

    await entry.save();
    return NextResponse.json(normalizedEntry(entry));
  }

  // Distributor: their own monthly record can be edited. Match legacy
  // records by email too, because the unique monthly index is userEmail+monthKey.
  if (entry.userId !== user.clerkId && entry.userEmail !== user.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (body.action !== "updateItems") {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  const requestedItems: SaleItemData[] = Array.isArray(body.items)
    ? body.items.map((raw: any) => ({
        category: raw?.category as SaleCategory,
        index: Number(raw?.index),
        state: raw?.state as SaleStatus,
      }))
    : [];

  for (const item of requestedItems) {
    if (
      !CATEGORIES.includes(item.category) ||
      !Number.isInteger(item.index) ||
      item.index < 1 ||
      !STATES.includes(item.state)
    ) {
      return NextResponse.json(
        { error: "Venta individual no válida" },
        { status: 400 },
      );
    }
  }

  // Existing finalized/rejected sales are immutable for distributors.
  for (const current of currentItems) {
    if (current.state !== "procesando") {
      const requested = requestedItems.find(
        (item) =>
          item.category === current.category && item.index === current.index,
      );

      if (!requested || requested.state !== current.state) {
        return NextResponse.json(
          {
            error:
              "Las ventas finalizadas o rechazadas no se pueden modificar ni eliminar.",
          },
          { status: 409 },
        );
      }
    }
  }

  const lockedItems = currentItems.filter(
    (item) => item.state !== "procesando",
  );

  const lockedKeys = new Set(
    lockedItems.map((item) => `${item.category}:${item.index}`),
  );

  const unlockedNextItems = requestedItems.filter(
    (item) => !lockedKeys.has(`${item.category}:${item.index}`),
  );

  if (unlockedNextItems.some((item) => item.state !== "procesando")) {
    return NextResponse.json(
      { error: "Solo puedes modificar ventas que estén en proceso." },
      { status: 409 },
    );
  }

  const items: SaleItemData[] = [...lockedItems, ...unlockedNextItems].sort(
    (a, b) => {
      const categoryOrder =
        CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
      return categoryOrder || a.index - b.index;
    },
  );

  const uniqueKeys = new Set(
    items.map((item) => `${item.category}:${item.index}`),
  );

  if (uniqueKeys.size !== items.length) {
    return NextResponse.json(
      { error: "No puedes duplicar una venta individual." },
      { status: 400 },
    );
  }

  const counts = countsFromItems(items);

  // Do NOT cap/limit counts to the target. The target is fixed; replacement
  // boxes and + boxes are allowed beyond it.
  if (items.length === 0) {
    return NextResponse.json(
      { error: "El registro debe conservar al menos una venta." },
      { status: 400 },
    );
  }

  entry.userId = user.clerkId;
  entry.userEmail = user.email;
  entry.items = items as typeof entry.items;
  entry.counts = counts;
  entry.status = deriveStatus(items);
  entry.snapshot.counts = counts;
  entry.snapshot.totalDone = counts.fibra + counts.luz + counts.gas;
  entry.snapshot.totalPct = entry.snapshot.totalTarget
    ? Math.round((entry.snapshot.totalDone / entry.snapshot.totalTarget) * 100)
    : 0;

  await entry.save();
  return NextResponse.json(normalizedEntry(entry));
}
