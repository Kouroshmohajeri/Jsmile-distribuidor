"use client";

import { useEffect, useMemo, useState } from "react";
import { estimateCommission, type ComisionModel } from "@/lib/commission";

type PlanId = "plan1" | "plan2" | "plan3" | "custom";

type Status = "procesando" | "finalizado" | "rechazado";

type Counts = {
  fibra: number;
  luz: number;
  gas: number;
};

type Targets = Counts;

type Entry = {
  _id: string;
  userEmail: string;
  monthKey: string;
  planId: PlanId;
  counts: Counts;
  status: Status;
  items?: { category: keyof Counts; index: number; state: Status }[];

  snapshot: {
    name: string;
    planLabel: string;
    targets: Targets;
    counts: Counts;
    totalDone: number;
    totalTarget: number;
    totalPct: number;
    createdAtLabel: string;
  };
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createProgressImage(entry: Entry) {
  const items = normalizeEntryItems(entry);
  const counts = {
    fibra: items.filter((item) => item.category === "fibra").length,
    luz: items.filter((item) => item.category === "luz").length,
    gas: items.filter((item) => item.category === "gas").length,
  };
  const processing = items.filter((item) => item.state === "procesando").length;
  const finished = items.filter((item) => item.state === "finalizado").length;
  const rejected = items.filter((item) => item.state === "rechazado").length;
  const total = items.length;
  const target = Math.max(1, entry.snapshot.totalTarget || 0);
  const progress = Math.min(100, Math.round((total / target) * 100));
  const month = getMonthLabel(entry.monthKey);
  const name = escapeXml(
    entry.snapshot.name || entry.userEmail || "Distribuidor",
  );
  const plan = escapeXml(entry.snapshot.planLabel || "Plan");

  const serviceCard = (
    x: number,
    label: string,
    count: number,
    targetValue: number,
    icon: string,
    accent: string,
  ) => {
    const pct =
      targetValue > 0
        ? Math.min(100, Math.round((count / targetValue) * 100))
        : 0;
    return `
      <rect x="${x}" y="330" width="330" height="170" rx="22" fill="#f7f8fb" stroke="#e5e7ee"/>
      <text x="${x + 28}" y="370" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#11183c">${icon}  ${label}</text>
      <text x="${x + 28}" y="418" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#11183c">${count} <tspan font-size="18" fill="#777b87">/ ${targetValue}</tspan></text>
      <rect x="${x + 28}" y="445" width="274" height="12" rx="6" fill="#e1e4eb"/>
      <rect x="${x + 28}" y="445" width="${Math.round((274 * pct) / 100)}" height="12" rx="6" fill="${accent}"/>
      <text x="${x + 302}" y="484" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${accent}">${pct}%</text>
    `;
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="header" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#11183c"/>
          <stop offset="100%" stop-color="#273471"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="#f5f6f9"/>
      <rect x="55" y="45" width="1090" height="810" rx="34" fill="white" stroke="#e2e5ec"/>
      <rect x="55" y="45" width="1090" height="205" rx="34" fill="url(#header)"/>
      <rect x="55" y="175" width="1090" height="75" fill="url(#header)"/>

      <text x="95" y="105" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="white">JSMILE</text>
      <text x="97" y="135" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="#c5ad75">DISTRIBUIDOR</text>
      <text x="1105" y="104" text-anchor="end" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#c5ad75">RESUMEN DE VENTAS</text>
      <text x="1105" y="136" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#cdd2e3">${escapeXml(month)}</text>

      <circle cx="110" cy="215" r="48" fill="#ffffff"/>
      <text x="110" y="226" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#1b2559">${escapeXml((entry.snapshot.name || entry.userEmail || "D").slice(0, 2).toUpperCase())}</text>
      <text x="180" y="211" font-family="Arial, sans-serif" font-size="25" font-weight="800" fill="white">${name}</text>
      <text x="180" y="238" font-family="Arial, sans-serif" font-size="15" fill="#cdd2e3">Distribuidor · ${plan}</text>

      <text x="95" y="295" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#777b87">PROGRESO DEL REGISTRO</text>
      <text x="1105" y="295" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#11183c">${total} / ${target} ventas · ${progress}%</text>
      <rect x="95" y="307" width="1010" height="10" rx="5" fill="#e1e4eb"/>
      <rect x="95" y="307" width="${Math.round((1010 * progress) / 100)}" height="10" rx="5" fill="#1b2559"/>

      ${serviceCard(95, "Fibra", counts.fibra, entry.snapshot.targets.fibra, "⌁", "#1b2559")}
      ${serviceCard(435, "Luz", counts.luz, entry.snapshot.targets.luz, "⚡", "#d59b00")}
      ${serviceCard(775, "Gas", counts.gas, entry.snapshot.targets.gas, "♨", "#d45b43")}

      <rect x="95" y="535" width="1010" height="145" rx="22" fill="#fafbfc" stroke="#e5e7ee"/>
      <text x="125" y="575" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#777b87">ESTADO DE LAS VENTAS</text>

      <text x="125" y="625" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1b2559">En proceso</text>
      <text x="125" y="655" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#1b2559">${processing}</text>

      <line x1="385" y1="590" x2="385" y2="655" stroke="#e1e4eb"/>
      <text x="430" y="625" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0c8b58">Finalizadas</text>
      <text x="430" y="655" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#0c8b58">${finished}</text>

      <line x1="690" y1="590" x2="690" y2="655" stroke="#e1e4eb"/>
      <text x="735" y="625" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#c53b2f">Rechazadas</text>
      <text x="735" y="655" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#c53b2f">${rejected}</text>

      <line x1="960" y1="590" x2="960" y2="655" stroke="#e1e4eb"/>
      <text x="1005" y="625" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#11183c">Total</text>
      <text x="1005" y="655" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#11183c">${total}</text>

      <text x="600" y="755" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#1b2559">¡Seguimos conectando un mejor futuro!</text>
      <text x="600" y="790" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#858995">JSMILE · Resumen generado al guardar el registro</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function normalizeEntryItems(entry: Entry): NonNullable<Entry["items"]> {
  if (Array.isArray(entry.items) && entry.items.length > 0) {
    return entry.items.map((item) => ({
      category: item.category,
      index: Number(item.index),
      state: item.state ?? "procesando",
    }));
  }

  // Backward compatibility for records created before individual items
  // were stored. Rebuild every saved box from the persisted counts.
  const rebuilt: NonNullable<Entry["items"]> = [];
  (Object.keys(entry.counts) as (keyof Counts)[]).forEach((category) => {
    const count = Math.max(0, Number(entry.counts[category] || 0));
    for (let index = 1; index <= count; index += 1) {
      rebuilt.push({ category, index, state: "procesando" });
    }
  });
  return rebuilt;
}

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

/**
 * Custom targets can be increased freely,
 * but never below the Model A bonus threshold:
 *
 * Fibra >= 8
 * Luz   >= 11
 * Gas   >= 4
 */
const CUSTOM_MINIMUMS: Targets = {
  fibra: 8,
  luz: 11,
  gas: 4,
};

const CUSTOM_DEFAULTS: Targets = {
  fibra: 9,
  luz: 12,
  gas: 5,
};

function getMonthKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function getMonthLabel(monthKey: string) {
  return new Date(`${monthKey}-01T12:00:00`).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function StatusPill({ status }: { status: Status }) {
  const config = {
    procesando: {
      label: "Procesando",
      className: "bg-blue-50 text-blue-700",
    },

    finalizado: {
      label: "Finalizado",
      className: "bg-emerald-50 text-emerald-700",
    },

    rechazado: {
      label: "Rechazado",
      className: "bg-red-50 text-red-700",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

/**
 * Quantity counter.
 *
 * The distributor does NOT need to add sales one by one.
 *
 * They can:
 * - type the exact quantity
 * - press + to increase
 * - press - to decrease
 *
 * The quantity can never exceed the selected target.
 */
function Counter({
  label,
  value,
  target,
  onChange,
}: {
  label: string;
  value: number;
  target: number;
  onChange: (value: number) => void;
}) {
  function handleBoxClick(number: number) {
    // Clicking any unchecked box fills everything from 1 through it.
    if (number > value) {
      onChange(number);
      return;
    }

    // Clicking a checked box removes it and everything after it.
    onChange(number - 1);
  }

  return (
    <div className="rounded-2xl border border-[#e8e9ee] bg-[#fafbfc] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-extrabold">{label}</p>
          <p className="mt-0.5 text-[11px] text-[#858995]">
            Objetivo: {target}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-[#9a9da7]">
            Seleccionadas
          </p>
          <p className="mt-1 text-xl font-black text-[#1b2559]">{value}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-9">
        {Array.from({ length: target }, (_, index) => index + 1).map(
          (number) => {
            const selected = number <= value;

            return (
              <button
                key={number}
                type="button"
                onClick={() => handleBoxClick(number)}
                className={[
                  "flex aspect-square items-center justify-center rounded-xl border text-sm font-black transition-all active:scale-95",
                  selected
                    ? "border-[#1b2559] bg-[#1b2559] text-white shadow-sm"
                    : "border-[#e2e4e9] bg-white text-[#1b2559] hover:bg-[#eef0f8]",
                ].join(" ")}
              >
                {selected ? "✓" : number}
              </button>
            );
          },
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] font-bold text-[#858995]">
          Marca las ventas realizadas
        </p>

        <p className="text-[10px] font-black text-[#1b2559]">
          {value} / {target}
        </p>
      </div>
    </div>
  );
}

function itemCounts(entry: Entry) {
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
    } as Record<Status, Counts>,
  );
}

export default function SalesRegister({
  commissionModel,
}: {
  commissionModel: ComisionModel;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);

  const [planId, setPlanId] = useState<PlanId>("plan1");

  const [customTargets, setCustomTargets] = useState<Targets>(CUSTOM_DEFAULTS);

  const [counts, setCounts] = useState<Counts>({
    fibra: 0,
    luz: 0,
    gas: 0,
  });

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [savedImage, setSavedImage] = useState("");

  const [loaded, setLoaded] = useState(false);

  const currentMonth = getMonthKey();

  const targets: Targets = planId === "custom" ? customTargets : PLANS[planId];

  const totalCurrent = counts.fibra + counts.luz + counts.gas;

  const targetCurrent = targets.fibra + targets.luz + targets.gas;

  const progress =
    targetCurrent > 0 ? Math.round((totalCurrent / targetCurrent) * 100) : 0;

  /*
   * ============================================================
   * LIVE COMMISSION
   * ============================================================
   *
   * The commission is based on the ACTUAL counts.
   *
   * The Model A bonus is independent of planId:
   *
   * Plan 1 + 8/11/4 => bonus
   * Plan 2 + 8/11/4 => bonus
   * Plan 3 + 8/11/4 => bonus
   * Custom + 8/11/4 => bonus
   *
   * The actual bonus condition lives inside
   * lib/commission.ts:
   *
   * Model A + Fibra >= 8 + Luz >= 11 + Gas >= 4
   */

  const liveCommission = useMemo(() => {
    return estimateCommission({
      model: commissionModel,
      fibra: counts.fibra,
      luz: counts.luz,
      gas: counts.gas,
    });
  }, [counts, commissionModel]);

  const liveEstimate = liveCommission.total;

  const processing = entries.filter((entry) =>
    normalizeEntryItems(entry).some((item) => item.state === "procesando"),
  );

  const finished = entries.filter((entry) =>
    normalizeEntryItems(entry).some((item) => item.state === "finalizado"),
  );

  const rejected = entries.filter((entry) =>
    normalizeEntryItems(entry).some((item) => item.state === "rechazado"),
  );

  const processingBoxCount = entries.reduce(
    (total, entry) =>
      total +
      normalizeEntryItems(entry).filter((item) => item.state === "procesando")
        .length,
    0,
  );

  const finishedBoxCount = entries.reduce(
    (total, entry) =>
      total +
      normalizeEntryItems(entry).filter((item) => item.state === "finalizado")
        .length,
    0,
  );

  const rejectedBoxCount = entries.reduce(
    (total, entry) =>
      total +
      normalizeEntryItems(entry).filter((item) => item.state === "rechazado")
        .length,
    0,
  );

  /*
   * ============================================================
   * SAVED PROCESSING COMMISSION
   * ============================================================
   */

  const processingEstimate = useMemo(() => {
    return processing.reduce((total, entry) => {
      const commission = estimateCommission({
        model: commissionModel,
        fibra: entry.counts.fibra,
        luz: entry.counts.luz,
        gas: entry.counts.gas,
      });

      return total + commission.total;
    }, 0);
  }, [processing, commissionModel]);

  async function loadEntries() {
    try {
      const response = await fetch("/api/sales", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = (await response.json()) as Entry[];

      const normalizedEntries = data.map((entry) => ({
        ...entry,
        items: normalizeEntryItems(entry),
      }));

      setEntries(normalizedEntries);

      // If there is already active data for the current month, restore it
      // in the registration form: select the same plan and preselect the
      // boxes that are still processing. We only do this when loading the
      // existing data, so normal user changes are never overwritten.
      const activeEntry = normalizedEntries.find((entry) => {
        if (entry.monthKey !== getMonthKey()) return false;
        return entry.items?.some((item) => item.state === "procesando");
      });

      if (activeEntry) {
        setPlanId(activeEntry.planId);

        if (activeEntry.planId === "custom") {
          setCustomTargets({
            fibra: Math.max(
              CUSTOM_MINIMUMS.fibra,
              activeEntry.snapshot.targets.fibra,
            ),
            luz: Math.max(
              CUSTOM_MINIMUMS.luz,
              activeEntry.snapshot.targets.luz,
            ),
            gas: Math.max(
              CUSTOM_MINIMUMS.gas,
              activeEntry.snapshot.targets.gas,
            ),
          });
        }

        const activeCounts = activeEntry.items.reduce(
          (result, item) => {
            if (item.state === "procesando") {
              result[item.category] += 1;
            }
            return result;
          },
          { fibra: 0, luz: 0, gas: 0 } as Counts,
        );

        const activeTargets =
          activeEntry.planId === "custom"
            ? activeEntry.snapshot.targets
            : PLANS[activeEntry.planId];

        setCounts({
          fibra: Math.min(activeCounts.fibra, activeTargets.fibra),
          luz: Math.min(activeCounts.luz, activeTargets.luz),
          gas: Math.min(activeCounts.gas, activeTargets.gas),
        });
      }
    } catch {
      setError("No se pudieron cargar tus registros.");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  function changePlan(next: PlanId) {
    setPlanId(next);

    setCounts({
      fibra: 0,
      luz: 0,
      gas: 0,
    });

    setError("");
  }

  function changeCount(key: keyof Counts, value: number) {
    const safeValue = Math.max(0, Math.min(Math.floor(value), targets[key]));

    setCounts((current) => ({
      ...current,
      [key]: safeValue,
    }));
  }

  /**
   * Custom target rules:
   *
   * Fibra cannot be below 8.
   * Luz cannot be below 11.
   * Gas cannot be below 4.
   *
   * Above those minimums, the user can enter
   * any number they want.
   *
   * Example:
   *
   * Fibra: 20
   * Luz:   25
   * Gas:   10
   *
   * is perfectly valid.
   */
  function changeCustomTarget(key: keyof Targets, value: number) {
    const minimum = CUSTOM_MINIMUMS[key];

    const parsedValue = Number.isFinite(value) ? Math.floor(value) : minimum;

    const nextValue = Math.max(minimum, parsedValue);

    setCustomTargets((current) => ({
      ...current,
      [key]: nextValue,
    }));

    /*
     * If the target is reduced below the
     * current count, trim the current count.
     *
     * Example:
     * target = 10
     * current = 10
     * target changed to 8
     * => current becomes 8
     */
    setCounts((current) => ({
      ...current,
      [key]: Math.min(current[key], nextValue),
    }));
  }

  function downloadProgressImage() {
    if (!savedImage) return;

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 900;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.drawImage(image, 0, 0, 1200, 900);

      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `jsmile-resumen-${currentMonth}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    image.src = savedImage;
  }

  async function save() {
    setError("");

    if (totalCurrent <= 0) {
      setError("Registra al menos una venta.");

      return;
    }

    /*
     * Custom targets are already protected by
     * changeCustomTarget(), but we also validate
     * here before sending anything to the API.
     */
    if (planId === "custom") {
      if (
        customTargets.fibra < CUSTOM_MINIMUMS.fibra ||
        customTargets.luz < CUSTOM_MINIMUMS.luz ||
        customTargets.gas < CUSTOM_MINIMUMS.gas
      ) {
        setError(
          "Los objetivos personalizados no pueden ser inferiores a 8 Fibra, 11 Luz y 4 Gas.",
        );

        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          monthKey: currentMonth,
          planId,
          counts,

          customTargets: planId === "custom" ? customTargets : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo guardar.");

        return;
      }

      const savedEntry: Entry = {
        ...data,
        items: normalizeEntryItems(data),
      };

      // Never clear or rebuild the registration form after saving.
      // The saved record itself also keeps every selected box visible.
      setEntries((current) => [savedEntry, ...current]);

      // IMPORTANT: do not reset the selected boxes after saving.
      // The distributor keeps exactly the selections they just made.
      // Create the downloadable progress image from the saved record.
      setSavedImage(createProgressImage(savedEntry));
      setToast("Guardado correctamente");

      window.setTimeout(() => {
        setToast("");
      }, 2500);
    } catch {
      setError("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-xl bg-[#1b2559] px-4 py-3 text-sm font-extrabold text-white shadow-xl">
          ✓ {toast}
        </div>
      )}
      {/* ======================================================
          COMMISSION HERO
      ======================================================= */}

      <div className="overflow-hidden rounded-3xl bg-[#11183c] text-white shadow-[0_20px_55px_rgba(17,24,60,.18)]">
        <div className="grid lg:grid-cols-[1fr_auto]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#c5ad75]" />

              <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#aeb5d0]">
                Estimación en tiempo real
              </p>
            </div>

            <div className="mt-5">
              <p className="text-4xl font-black tracking-tight sm:text-5xl">
                €{liveEstimate.toFixed(2)}
              </p>

              <p className="mt-2 max-w-md text-sm leading-5 text-[#aeb5d0]">
                Comisión estimada según tu Modelo{" "}
                <strong>{commissionModel}</strong>. El importe se recalcula
                inmediatamente al modificar tus ventas.
              </p>

              {commissionModel === "A" && liveCommission.bonus > 0 && (
                <p className="mt-3 inline-flex rounded-lg bg-emerald-400/10 px-3 py-2 text-[10px] font-bold text-emerald-200">
                  ✓ Bonus de €500 alcanzado: 8 Fibra · 11 Luz · 4 Gas
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/5 p-6 lg:w-72 lg:border-l lg:border-t-0 sm:p-8">
            <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#aeb5d0]">
              Guardado en proceso
            </p>

            <p className="mt-2 text-2xl font-black">
              €{processingEstimate.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-[#8f96b4]">
              {processingBoxCount} venta{processingBoxCount === 1 ? "" : "s"} en
              proceso
            </p>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#c5ad75] transition-all"
                style={{
                  width: `${Math.min(100, progress)}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[10px] font-bold text-[#8f96b4]">
              {totalCurrent} / {targetCurrent} ventas
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          REGISTER
      ======================================================= */}

      <section className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-[0_12px_35px_rgba(18,20,28,.055)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-[#eef0f3] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
              Registro
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Registro de Ventas
            </h2>

            <p className="mt-1 text-sm text-[#777b87]">
              {getMonthLabel(currentMonth)}
            </p>
          </div>

          <div className="rounded-xl bg-[#f4f5f8] px-4 py-2 text-right">
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858995]">
              Modelo de comisión
            </p>

            <p className="text-sm font-extrabold text-[#1b2559]">
              Modelo {commissionModel}
            </p>
          </div>
        </div>

        {/* ====================================================
            PLAN SELECTOR
        ===================================================== */}

        <div className="mt-6">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[1px] text-[#777b87]">
            Selecciona tu plan
          </p>

          <div className="grid gap-2 sm:grid-cols-4">
            {(["plan1", "plan2", "plan3", "custom"] as PlanId[]).map((id) => {
              const selected = planId === id;

              const plan =
                id === "custom"
                  ? {
                      label: "Personalizado",
                      fibra: customTargets.fibra,
                      luz: customTargets.luz,
                      gas: customTargets.gas,
                    }
                  : PLANS[id];

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => changePlan(id)}
                  className={[
                    "rounded-2xl border p-4 text-left transition duration-200",
                    selected
                      ? "border-[#1b2559] bg-[#eef0f8] shadow-sm"
                      : "border-[#e7e9ee] bg-[#fafbfc] hover:border-[#cfd3e2] hover:bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black">{plan.label}</span>

                    <span
                      className={[
                        "h-4 w-4 rounded-full border-4",
                        selected
                          ? "border-[#1b2559] bg-white"
                          : "border-[#d6d9e1] bg-white",
                      ].join(" ")}
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-[#777b87]">
                    {plan.fibra} fibra · {plan.luz} luz · {plan.gas} gas
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ====================================================
            CUSTOM TARGETS
        ===================================================== */}

        {planId === "custom" && (
          <div className="mt-3 rounded-2xl border border-[#e7e9ee] bg-[#fafbfc] p-4">
            <p className="mb-1 text-xs font-extrabold text-[#777b87]">
              Objetivos personalizados
            </p>

            <p className="mb-3 text-[10px] text-[#858995]">
              Mínimo: 8 Fibra · 11 Luz · 4 Gas. Puedes introducir cualquier
              cantidad superior.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {(["fibra", "luz", "gas"] as const).map((key) => (
                <label key={key}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                    {key}
                  </span>

                  <input
                    type="number"
                    inputMode="numeric"
                    min={CUSTOM_MINIMUMS[key]}
                    step={1}
                    value={customTargets[key]}
                    onChange={(event) =>
                      changeCustomTarget(key, Number(event.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-[#e1e3e9] bg-white px-3 py-2.5 text-center text-sm font-bold outline-none focus:border-[#1b2559]"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================
            COUNTERS
        ===================================================== */}

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <Counter
            label="Fibra"
            value={counts.fibra}
            target={targets.fibra}
            onChange={(value) => changeCount("fibra", value)}
          />

          <Counter
            label="Luz"
            value={counts.luz}
            target={targets.luz}
            onChange={(value) => changeCount("luz", value)}
          />

          <Counter
            label="Gas"
            value={counts.gas}
            target={targets.gas}
            onChange={(value) => changeCount("gas", value)}
          />
        </div>

        {/* ====================================================
            COMMISSION BREAKDOWN
        ===================================================== */}

        <div className="mt-5 rounded-2xl border border-[#e7e9ee] bg-[#fafbfc] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-[1px] text-[#777b87]">
              Desglose de comisión
            </p>

            <span className="rounded-full bg-[#eef0f8] px-2.5 py-1 text-[10px] font-black text-[#1b2559]">
              Modelo {commissionModel}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Fibra
              </p>

              <p className="mt-1 text-sm font-black">
                €{liveCommission.fibraTotal.toFixed(2)}
              </p>

              <p className="text-[9px] text-[#858995]">
                €{liveCommission.fibraRate} / venta
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Luz
              </p>

              <p className="mt-1 text-sm font-black">
                €{liveCommission.luzTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Gas
              </p>

              <p className="mt-1 text-sm font-black">
                €{liveCommission.gasTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Alarmas
              </p>

              <p className="mt-1 text-sm font-black">
                €{liveCommission.alarmaTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Bonus
              </p>

              <p className="mt-1 text-sm font-black">
                €{liveCommission.bonus.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-[#eef0f8] p-2">
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Total
              </p>

              <p className="mt-1 text-sm font-black text-[#1b2559]">
                €{liveCommission.total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* ====================================================
            LIVE SUMMARY
        ===================================================== */}

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f5f6f9] p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858995]">
              Ventas
            </p>

            <p className="mt-1 text-xl font-black">{totalCurrent}</p>
          </div>

          <div className="rounded-2xl bg-[#f5f6f9] p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858995]">
              Progreso
            </p>

            <p className="mt-1 text-xl font-black">{progress}%</p>
          </div>

          <div className="rounded-2xl bg-[#eef0f8] p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858995]">
              Comisión estimada
            </p>

            <p className="mt-1 text-xl font-black text-[#1b2559]">
              €{liveEstimate.toFixed(2)}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* ====================================================
            SAVE
        ===================================================== */}

        <button
          type="button"
          onClick={save}
          disabled={saving || totalCurrent === 0}
          className="mt-5 w-full rounded-2xl bg-[#1b2559] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-[#1b2559]/15 transition hover:bg-[#273471] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Guardando..."
            : `Guardar registro · €${liveEstimate.toFixed(2)} aprox.`}
        </button>
      </section>

      {savedImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#11183c]/70 p-4 backdrop-blur-sm">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e7e9ee] px-5 py-4 sm:px-6">
              <div>
                <p className="text-lg font-black text-[#11183c]">
                  ¡Registro guardado!
                </p>
                <p className="mt-0.5 text-xs text-[#777b87]">
                  Tu resumen de progreso está listo para descargar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSavedImage("")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f7] text-xl font-bold text-[#777b87] transition hover:bg-[#e9ebf0]"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto bg-[#f5f6f9] p-4 sm:p-6">
              <img
                src={savedImage}
                alt="Resumen de progreso de ventas"
                className="mx-auto block w-full rounded-2xl shadow-lg"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#e7e9ee] p-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setSavedImage("")}
                className="rounded-xl border border-[#dfe2e8] bg-white px-5 py-3 text-sm font-extrabold text-[#1b2559] transition hover:bg-[#f7f8fa]"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={downloadProgressImage}
                className="rounded-xl bg-[#1b2559] px-5 py-3 text-center text-sm font-extrabold text-white shadow-lg shadow-[#1b2559]/15 transition hover:bg-[#273471]"
              >
                ↓ Descargar imagen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          SAVED RECORDS
      ======================================================= */}

      {loaded && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* ==================================================
              PROCESSING
          =================================================== */}

          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-blue-600">
                  Pendientes
                </p>

                <h3 className="mt-1 text-lg font-black">En proceso</h3>
              </div>

              <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-blue-50 px-2 text-sm font-black text-blue-700">
                {processingBoxCount}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {processing.length === 0 ? (
                <p className="rounded-xl bg-[#f7f8fa] p-4 text-xs text-[#858995]">
                  No hay ventas en proceso.
                </p>
              ) : (
                processing.map((entry) => (
                  <div
                    key={entry._id}
                    className="rounded-2xl border border-[#edf0f4] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">
                          {entry.snapshot.planLabel}
                        </p>

                        <p className="mt-1 text-xs text-[#858995]">
                          {itemCounts(entry).procesando.fibra +
                            itemCounts(entry).procesando.luz +
                            itemCounts(entry).procesando.gas}{" "}
                          ventas en proceso
                        </p>
                      </div>

                      <StatusPill status={entry.status} />
                    </div>

                    <p className="mt-3 text-[10px] text-[#9a9da7]">
                      {entry.snapshot.createdAtLabel}
                    </p>

                    <p className="mt-2 text-xs font-bold text-[#1b2559]">
                      Comisión estimada: €
                      {estimateCommission({
                        model: commissionModel,
                        fibra: entry.counts.fibra,
                        luz: entry.counts.luz,
                        gas: entry.counts.gas,
                      }).total.toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ==================================================
              FINISHED
          =================================================== */}

          <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-emerald-600">
                  Confirmadas
                </p>

                <h3 className="mt-1 text-lg font-black">Finalizadas</h3>
              </div>

              <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-emerald-50 px-2 text-sm font-black text-emerald-700">
                {finishedBoxCount}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {finished.length === 0 ? (
                <p className="rounded-xl bg-[#f7f8fa] p-4 text-xs text-[#858995]">
                  Todavía no tienes ventas finalizadas.
                </p>
              ) : (
                finished.map((entry) => (
                  <div
                    key={entry._id}
                    className="rounded-2xl border border-[#edf0f4] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">
                          {entry.snapshot.planLabel}
                        </p>

                        <p className="mt-1 text-xs text-[#858995]">
                          {itemCounts(entry).finalizado.fibra +
                            itemCounts(entry).finalizado.luz +
                            itemCounts(entry).finalizado.gas}{" "}
                          ventas finalizadas
                        </p>
                      </div>

                      <StatusPill status={entry.status} />
                    </div>

                    <p className="mt-3 text-[10px] text-[#9a9da7]">
                      {entry.snapshot.createdAtLabel}
                    </p>

                    <p className="mt-2 text-xs font-bold text-emerald-700">
                      Comisión: €
                      {estimateCommission({
                        model: commissionModel,
                        fibra: entry.counts.fibra,
                        luz: entry.counts.luz,
                        gas: entry.counts.gas,
                      }).total.toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ==================================================
              REJECTED
          =================================================== */}

          {rejected.length > 0 && (
            <section className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-red-600">
                    Atención
                  </p>

                  <h3 className="mt-1 text-lg font-black">Rechazadas</h3>
                </div>

                <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-red-50 px-2 text-sm font-black text-red-700">
                  {rejectedBoxCount}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {rejected.map((entry) => (
                  <div
                    key={entry._id}
                    className="rounded-2xl border border-red-100 bg-red-50/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">
                          {entry.snapshot.planLabel}
                        </p>

                        <p className="mt-1 text-xs text-red-700/70">
                          {itemCounts(entry).rechazado.fibra +
                            itemCounts(entry).rechazado.luz +
                            itemCounts(entry).rechazado.gas}{" "}
                          ventas rechazadas
                        </p>
                      </div>

                      <StatusPill status={entry.status} />
                    </div>

                    <p className="mt-3 text-[10px] text-red-700/50">
                      {entry.snapshot.createdAtLabel}
                    </p>

                    <p className="mt-2 text-xs font-bold text-red-700">
                      Este registro no se incluye en la estimación de comisión.
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
