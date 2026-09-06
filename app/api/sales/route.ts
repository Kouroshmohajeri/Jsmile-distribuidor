import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import SalesEntry, { SaleCategory, SaleStatus } from "@/lib/models/SalesEntry";

const PLANS = {
  plan1: {
    label: "Plan 1",
    fibra: 8,
    luz: 11,
    gas: 4,
  },
  plan2: {
    label: "Plan 2",
    fibra: 11,
    luz: 11,
    gas: 4,
  },
  plan3: {
    label: "Plan 3",
    fibra: 15,
    luz: 11,
    gas: 4,
  },
} as const;

const CATEGORIES: SaleCategory[] = ["fibra", "luz", "gas"];

function deriveStatus(items: { state: SaleStatus }[]): SaleStatus {
  if (items.some((item) => item.state === "rechazado")) {
    return "rechazado";
  }

  if (items.length > 0 && items.every((item) => item.state === "finalizado")) {
    return "finalizado";
  }

  return "procesando";
}

export async function GET() {
  const user = await requireUser();

  await dbConnect();

  const entries = await SalesEntry.find({
    userId: user.clerkId,
  })
    .sort({
      createdAt: -1,
    })
    .lean();

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const user = await requireUser();

  await dbConnect();

  const body = await request.json();

  const planId = body.planId as keyof typeof PLANS | "custom";

  const monthKey = String(body.monthKey || "");

  const name = String(body.name || user.name || "").trim();

  if (!["plan1", "plan2", "plan3", "custom"].includes(planId)) {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return NextResponse.json({ error: "Mes no válido" }, { status: 400 });
  }

  const rawCounts = {
    fibra: Math.max(0, Number(body.counts?.fibra || 0)),

    luz: Math.max(0, Number(body.counts?.luz || 0)),

    gas: Math.max(0, Number(body.counts?.gas || 0)),
  };

  const targets =
    planId === "custom"
      ? {
          fibra: Math.max(8, Number(body.customTargets?.fibra || 8)),

          luz: Math.max(11, Number(body.customTargets?.luz || 11)),

          gas: Math.max(4, Number(body.customTargets?.gas || 4)),
        }
      : PLANS[planId];

  const counts = {
    fibra: Math.min(rawCounts.fibra, targets.fibra),

    luz: Math.min(rawCounts.luz, targets.luz),

    gas: Math.min(rawCounts.gas, targets.gas),
  };

  const totalDone = counts.fibra + counts.luz + counts.gas;

  const totalTarget = targets.fibra + targets.luz + targets.gas;

  if (totalDone === 0) {
    return NextResponse.json(
      {
        error: "Registra al menos una venta antes de guardar.",
      },
      { status: 400 },
    );
  }

  // Crear una venta individual por cada casilla seleccionada.
  const items = CATEGORIES.flatMap((category) =>
    Array.from(
      {
        length: counts[category],
      },
      (_, index) => ({
        category,
        index: index + 1,
        state: "procesando" as SaleStatus,
      }),
    ),
  );

  const createdAt = new Date();

  const planLabel =
    planId === "custom" ? "Plan Personalizado" : PLANS[planId].label;

  const status = deriveStatus(items);

  const entry = await SalesEntry.create({
    userId: user.clerkId,
    userEmail: user.email,

    monthKey,

    planId,

    customTargets: planId === "custom" ? targets : undefined,

    // Ventas individuales.
    items,

    // Contadores generales.
    counts,

    status,

    snapshot: {
      name,
      monthKey,
      planId,
      planLabel,

      targets,

      // Mantener snapshot completo.
      counts,

      totalDone,

      totalTarget,

      totalPct: Math.round((totalDone / totalTarget) * 100),

      createdAtLabel: createdAt.toLocaleString("es-ES"),

      comisionModel: user.comisionModel,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
