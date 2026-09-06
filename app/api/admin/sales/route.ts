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

function deriveStatus(items: { state: SaleStatus }[]): SaleStatus {
  if (items.some((item) => item.state === "rechazado")) return "rechazado";
  if (items.length > 0 && items.every((item) => item.state === "finalizado")) return "finalizado";
  return "procesando";
}

function countsFromItems(items: { category: SaleCategory }[]) {
  return items.reduce(
    (counts, item) => {
      counts[item.category] += 1;
      return counts;
    },
    { fibra: 0, luz: 0, gas: 0 },
  );
}

export async function GET() {
  const user = await requireUser();
  await dbConnect();

  const entries = await SalesEntry.find({ userId: user.clerkId }).sort({ createdAt: -1 }).lean();

  const normalized = entries.map((entry) => {
    const items = Array.isArray(entry.items) ? entry.items : [];
    const counts = countsFromItems(items as { category: SaleCategory }[]);
    const status = deriveStatus(items as { state: SaleStatus }[]);

    return {
      ...entry,
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
  });

  return NextResponse.json(normalized);
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

  const rawTargets = planId === "custom" ? body.customTargets : PLANS[planId];
  const targets = {
    fibra: Math.max(8, Math.floor(Number(rawTargets?.fibra || 0))),
    luz: Math.max(11, Math.floor(Number(rawTargets?.luz || 0))),
    gas: Math.max(4, Math.floor(Number(rawTargets?.gas || 0))),
  };

  const counts = {
    fibra: Math.min(targets.fibra, Math.max(0, Math.floor(Number(body.counts?.fibra || 0)))),
    luz: Math.min(targets.luz, Math.max(0, Math.floor(Number(body.counts?.luz || 0)))),
    gas: Math.min(targets.gas, Math.max(0, Math.floor(Number(body.counts?.gas || 0)))),
  };

  const items = CATEGORIES.flatMap((category) =>
    Array.from({ length: counts[category] }, (_, index) => ({
      category,
      index: index + 1,
      state: "procesando" as const,
    })),
  );

  if (items.length === 0) {
    return NextResponse.json({ error: "Registra al menos una venta antes de guardar." }, { status: 400 });
  }

  const createdAt = new Date();
  const planLabel = planId === "custom" ? "Plan Personalizado" : PLANS[planId].label;
  const totalTarget = targets.fibra + targets.luz + targets.gas;

  const entry = await SalesEntry.create({
    userId: user.clerkId,
    userEmail: user.email,
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
      totalDone: items.length,
      totalTarget,
      totalPct: Math.round((items.length / totalTarget) * 100),
      createdAtLabel: createdAt.toLocaleString("es-ES"),
      comisionModel: user.comisionModel,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
