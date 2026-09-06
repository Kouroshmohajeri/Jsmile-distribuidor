import { NextResponse } from "next/server";

import { requireAdmin, requireUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import SalesEntry, { SaleCategory, SaleStatus } from "@/lib/models/SalesEntry";

const STATES: SaleStatus[] = ["procesando", "finalizado", "rechazado"];

const CATEGORIES: SaleCategory[] = ["fibra", "luz", "gas"];

type Counts = {
  fibra: number;
  luz: number;
  gas: number;
};

type SaleItem = {
  category: SaleCategory;
  index: number;
  state: SaleStatus;
};

function deriveStatus(items: SaleItem[]): SaleStatus {
  if (items.some((item) => item.state === "rechazado")) {
    return "rechazado";
  }

  if (items.length > 0 && items.every((item) => item.state === "finalizado")) {
    return "finalizado";
  }

  return "procesando";
}

function countsFromItems(items: SaleItem[]): Counts {
  return items.reduce<Counts>(
    (counts, item) => {
      counts[item.category] += 1;
      return counts;
    },
    { fibra: 0, luz: 0, gas: 0 },
  );
}

function normalizedEntry(entry: any) {
  const items: SaleItem[] = Array.isArray(entry.items) ? entry.items : [];

  const counts = countsFromItems(items);
  const status = deriveStatus(items);

  return {
    ...entry.toObject(),
    counts,
    status,
    snapshot: {
      ...entry.snapshot,
      counts,
      totalDone: items.length,
      totalPct: entry.snapshot?.totalTarget
        ? Math.round((items.length / entry.snapshot.totalTarget) * 100)
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

  return NextResponse.json({
    ok: true,
    deletedBy: admin.email,
  });
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

    const item = entry.items.find(
      (current: SaleItem) =>
        current.category === category && current.index === index,
    );

    if (!item) {
      return NextResponse.json(
        { error: "Venta individual no encontrada" },
        { status: 404 },
      );
    }

    item.state = state;

    entry.status = deriveStatus(entry.items);

    const counts = countsFromItems(entry.items);

    entry.counts = counts;
    entry.snapshot.counts = counts;
    entry.snapshot.totalDone = entry.items.length;
    entry.snapshot.totalPct = entry.snapshot.totalTarget
      ? Math.round((entry.items.length / entry.snapshot.totalTarget) * 100)
      : 0;

    await entry.save();

    return NextResponse.json(normalizedEntry(entry));
  }

  // Distributor: only their own records can be edited,
  // and only while every individual sale is still in process.
  if (entry.userId !== user.clerkId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (
    entry.status !== "procesando" ||
    entry.items.some((item: SaleItem) => item.state !== "procesando")
  ) {
    return NextResponse.json(
      {
        error:
          "Solo puedes modificar registros que sigan completamente en proceso.",
      },
      { status: 409 },
    );
  }

  if (body.action !== "updateCounts") {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  const requested = body.counts || {};
  const targets = entry.snapshot.targets;

  const counts: Counts = {
    fibra: Math.max(
      0,
      Math.min(Math.floor(Number(requested.fibra || 0)), targets.fibra),
    ),
    luz: Math.max(
      0,
      Math.min(Math.floor(Number(requested.luz || 0)), targets.luz),
    ),
    gas: Math.max(
      0,
      Math.min(Math.floor(Number(requested.gas || 0)), targets.gas),
    ),
  };

  if (counts.fibra + counts.luz + counts.gas === 0) {
    return NextResponse.json(
      { error: "El registro debe conservar al menos una venta." },
      { status: 400 },
    );
  }

  entry.items = CATEGORIES.flatMap((category) =>
    Array.from({ length: counts[category] }, (_, index) => ({
      category,
      index: index + 1,
      state: "procesando" as SaleStatus,
    })),
  );

  entry.counts = counts;
  entry.status = "procesando";
  entry.snapshot.counts = counts;
  entry.snapshot.totalDone = entry.items.length;
  entry.snapshot.totalPct = entry.snapshot.totalTarget
    ? Math.round((entry.items.length / entry.snapshot.totalTarget) * 100)
    : 0;

  await entry.save();

  return NextResponse.json(normalizedEntry(entry));
}
