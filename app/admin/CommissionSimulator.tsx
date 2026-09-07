"use client";

import { useMemo, useState } from "react";
import { estimateCommission, type ComisionModel } from "@/lib/commission";

type PlanId = "plan1" | "plan2" | "plan3" | "custom";

type Counts = {
  fibra: number;
  luz: number;
  gas: number;
};

type Targets = Counts;

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
    if (number > value) {
      onChange(number);
      return;
    }

    onChange(number - 1);
  }

  function increase() {
    onChange(value + 1);
  }

  function decrease() {
    onChange(value - 1);
  }

  return (
    <div className="rounded-2xl border border-[#e8e9ee] bg-[#fafbfc] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">{label}</p>

          <p className="mt-0.5 text-[11px] text-[#858995]">Ventas simuladas</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={decrease}
            disabled={value <= 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe2e8] bg-white text-sm font-black text-[#1b2559] transition hover:bg-[#eef0f8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>

          <input
            type="number"
            min={0}
            value={value}
            onChange={(event) => {
              const parsed = Number(event.target.value);

              if (!Number.isFinite(parsed)) {
                onChange(0);
                return;
              }

              onChange(Math.max(0, Math.floor(parsed)));
            }}
            className="h-8 w-14 rounded-lg border border-[#dfe2e8] bg-white text-center text-sm font-black text-[#1b2559] outline-none focus:border-[#1b2559]"
          />

          <button
            type="button"
            onClick={increase}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe2e8] bg-white text-sm font-black text-[#1b2559] transition hover:bg-[#eef0f8]"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-9">
        {Array.from(
          {
            length: Math.max(target, value),
          },
          (_, index) => index + 1,
        ).map((number) => {
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
        })}
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

function CommissionCard({
  model,
  commission,
  counts,
}: {
  model: ComisionModel;
  commission: ReturnType<typeof estimateCommission>;
  counts: Counts;
}) {
  const totalSales = counts.fibra + counts.luz + counts.gas;

  const bonusReached =
    model === "A" && counts.fibra >= 8 && counts.luz >= 11 && counts.gas >= 4;

  return (
    <div
      className={[
        "overflow-hidden rounded-3xl shadow-[0_12px_35px_rgba(18,20,28,.055)]",
        model === "A" ? "border border-[#d9ddec]" : "border border-[#e4e6ec]",
      ].join(" ")}
    >
      <div className="bg-[#11183c] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#aeb5d0]">
              Simulación
            </p>

            <h3 className="mt-1 text-2xl font-black">Modelo {model}</h3>
          </div>

          <div className="rounded-xl bg-white/10 px-3 py-2 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#aeb5d0]">
              Ventas
            </p>

            <p className="text-lg font-black">{totalSales}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#aeb5d0]">
            Comisión estimada
          </p>

          <p className="mt-1 text-4xl font-black tracking-tight">
            €{commission.total.toFixed(2)}
          </p>

          {bonusReached && (
            <div className="mt-4 rounded-xl bg-emerald-400/10 px-3 py-2.5 text-[11px] font-bold text-emerald-200">
              ✓ Bonus de €500 alcanzado
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-5">
        <div className="rounded-2xl border border-[#e7e9ee] bg-[#fafbfc] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-[1px] text-[#777b87]">
              Desglose de comisión
            </p>

            <span className="rounded-full bg-[#eef0f8] px-2.5 py-1 text-[10px] font-black text-[#1b2559]">
              Modelo {model}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Fibra
              </p>

              <p className="mt-1 text-sm font-black">
                €{commission.fibraTotal.toFixed(2)}
              </p>

              <p className="text-[9px] text-[#858995]">
                €{commission.fibraRate} / venta
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Luz
              </p>

              <p className="mt-1 text-sm font-black">
                €{commission.luzTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Gas
              </p>

              <p className="mt-1 text-sm font-black">
                €{commission.gasTotal.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Alarmas
              </p>

              <p className="mt-1 text-sm font-black">
                €{commission.alarmaTotal.toFixed(2)}
              </p>

              <p className="text-[9px] text-[#858995]">
                No incluidas en este simulador
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Bonus
              </p>

              <p
                className={[
                  "mt-1 text-sm font-black",
                  commission.bonus > 0 ? "text-emerald-600" : "text-[#1b2559]",
                ].join(" ")}
              >
                €{commission.bonus.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-[#eef0f8] p-2">
              <p className="text-[9px] font-bold uppercase text-[#858995]">
                Total
              </p>

              <p className="mt-1 text-sm font-black text-[#1b2559]">
                €{commission.total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommissionSimulator() {
  const [open, setOpen] = useState(false);

  const [planId, setPlanId] = useState<PlanId>("plan1");

  const [customTargets, setCustomTargets] = useState<Targets>(CUSTOM_DEFAULTS);

  const [counts, setCounts] = useState<Counts>({
    fibra: 0,
    luz: 0,
    gas: 0,
  });

  const targets: Targets = planId === "custom" ? customTargets : PLANS[planId];

  const modelA = useMemo(
    () =>
      estimateCommission({
        model: "A",
        fibra: counts.fibra,
        luz: counts.luz,
        gas: counts.gas,
      }),
    [counts],
  );

  const modelB = useMemo(
    () =>
      estimateCommission({
        model: "B",
        fibra: counts.fibra,
        luz: counts.luz,
        gas: counts.gas,
      }),
    [counts],
  );

  const totalCurrent = counts.fibra + counts.luz + counts.gas;

  function changePlan(nextPlan: PlanId) {
    setPlanId(nextPlan);

    setCounts({
      fibra: 0,
      luz: 0,
      gas: 0,
    });
  }

  function changeCount(key: keyof Counts, value: number) {
    const safeValue = Math.max(0, Math.floor(value));

    setCounts((current) => ({
      ...current,
      [key]: safeValue,
    }));
  }

  function changeCustomTarget(key: keyof Targets, value: number) {
    const minimum = CUSTOM_MINIMUMS[key];

    const parsedValue = Number.isFinite(value) ? Math.floor(value) : minimum;

    setCustomTargets((current) => ({
      ...current,
      [key]: Math.max(minimum, parsedValue),
    }));
  }

  function resetSimulator() {
    setPlanId("plan1");

    setCustomTargets(CUSTOM_DEFAULTS);

    setCounts({
      fibra: 0,
      luz: 0,
      gas: 0,
    });
  }

  return (
    <section className="rounded-3xl border border-[#e4e6ec] bg-white shadow-[0_12px_35px_rgba(18,20,28,.055)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
        aria-expanded={open}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef0f8] text-xl">
            🧮
          </div>

          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
              Herramienta de administración
            </p>

            <h2 className="mt-1 text-xl font-black tracking-tight text-[#11183c]">
              Simulador de comisiones
            </h2>

            <p className="mt-1 text-sm text-[#777b87]">
              Calcula cuánto cobraría un distribuidor sin guardar ninguna venta.
            </p>
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f5f8] text-lg font-black text-[#1b2559]">
          {open ? "−" : "+"}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#eef0f3] p-5 sm:p-7">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-bold text-amber-800">
              Simulación solamente
            </p>

            <p className="mt-1 text-[11px] leading-5 text-amber-700">
              Los valores introducidos aquí no se guardan, no crean ventas y no
              modifican ningún distribuidor.
            </p>
          </div>

          {/* PLAN SELECTOR */}

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

          {/* CUSTOM TARGETS */}

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

          {/* COUNTERS */}

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

          {/* SUMMARY */}

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f5f6f9] p-4">
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858995]">
                Ventas
              </p>

              <p className="mt-1 text-xl font-black">{totalCurrent}</p>
            </div>

            <div className="rounded-2xl bg-[#f5f6f9] p-4">
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858995]">
                Objetivo
              </p>

              <p className="mt-1 text-xl font-black">
                {targets.fibra + targets.luz + targets.gas}
              </p>
            </div>

            <div className="rounded-2xl bg-[#eef0f8] p-4">
              <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858995]">
                Diferencia A → B
              </p>

              <p className="mt-1 text-xl font-black text-[#1b2559]">
                €{(modelB.total - modelA.total).toFixed(2)}
              </p>
            </div>
          </div>

          {/* MODEL RESULTS */}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <CommissionCard model="A" commission={modelA} counts={counts} />

            <CommissionCard model="B" commission={modelB} counts={counts} />
          </div>

          {/* RESET */}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={resetSimulator}
              className="rounded-xl border border-[#dfe2e8] bg-white px-4 py-2.5 text-xs font-extrabold text-[#1b2559] transition hover:bg-[#f4f5f8]"
            >
              Reiniciar simulador
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
