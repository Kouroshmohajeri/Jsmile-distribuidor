"use client";

import { useEffect, useMemo, useState } from "react";
import { estimateCommission, type ComisionModel } from "@/lib/commission";
import type { Counts, Entry, PlanId, Status, Targets, SaleItem } from "./types";
import { PLANS, CUSTOM_DEFAULTS, CUSTOM_MINIMUMS } from "./constants";
import {
  addSequentialDraftItems,
  countsFromItems,
  getMonthKey,
  getMonthLabel,
  itemCounts,
  normalizeEntryItems,
  sortItems,
} from "./utils";
import { Counter } from "./Counter";
import { StatusPill } from "./StatusPill";
import { createProgressImage } from "./ProgressImage";

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

  const [draftItems, setDraftItems] = useState<NonNullable<Entry["items"]>>([]);

  // Extra boxes are allowed only after the distributor reaches the objective.
  // Rejected saved sales add their own replacement box automatically.
  const [extraBoxes, setExtraBoxes] = useState<Counts>({
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

  const currentEntry = entries.find((entry) => entry.monthKey === currentMonth);
  const savedMonthlyItems = currentEntry
    ? normalizeEntryItems(currentEntry)
    : [];
  const monthlyItems = draftItems;
  const hasMonthlyEntry = Boolean(currentEntry);

  const targets: Targets = currentEntry
    ? currentEntry.snapshot.targets
    : planId === "custom"
      ? customTargets
      : {
          fibra: PLANS[planId].fibra,
          luz: PLANS[planId].luz,
          gas: PLANS[planId].gas,
        };

  const rejectedCounts = savedMonthlyItems.reduce<Counts>(
    (result, item) => {
      if (item.state === "rechazado") {
        result[item.category] += 1;
      }
      return result;
    },
    { fibra: 0, luz: 0, gas: 0 },
  );

  // Preserve every saved box number. This is important after a rejection
  // (#2 rejected -> replacement #9 when the objective is 8) and after using +.
  // The objective itself never changes; this only controls how many boxes
  // are displayed.
  const highestSavedIndexes = savedMonthlyItems.reduce<Counts>(
    (result, item) => {
      result[item.category] = Math.max(result[item.category], item.index);
      return result;
    },
    { fibra: 0, luz: 0, gas: 0 },
  );

  const availableTargets: Counts = {
    fibra:
      Math.max(
        targets.fibra + rejectedCounts.fibra,
        highestSavedIndexes.fibra,
      ) + extraBoxes.fibra,
    luz:
      Math.max(
        targets.luz + rejectedCounts.luz,
        highestSavedIndexes.luz,
      ) + extraBoxes.luz,
    gas:
      Math.max(
        targets.gas + rejectedCounts.gas,
        highestSavedIndexes.gas,
      ) + extraBoxes.gas,
  };

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

  const processing =
    currentEntry &&
    savedMonthlyItems.some((item) => item.state === "procesando")
      ? [
          {
            ...currentEntry,
            items: savedMonthlyItems.filter(
              (item) => item.state === "procesando",
            ),
          },
        ]
      : [];

  const finished =
    currentEntry &&
    savedMonthlyItems.some((item) => item.state === "finalizado")
      ? [
          {
            ...currentEntry,
            items: savedMonthlyItems.filter(
              (item) => item.state === "finalizado",
            ),
          },
        ]
      : [];

  const rejected =
    currentEntry && savedMonthlyItems.some((item) => item.state === "rechazado")
      ? [currentEntry]
      : [];

  const processingBoxCount = savedMonthlyItems.filter(
    (item) => item.state === "procesando",
  ).length;

  const finishedBoxCount = savedMonthlyItems.filter(
    (item) => item.state === "finalizado",
  ).length;

  const rejectedBoxCount = savedMonthlyItems.filter(
    (item) => item.state === "rechazado",
  ).length;

  /*
   * ============================================================
   * SAVED PROCESSING COMMISSION
   * ============================================================
   */

  const processingEstimate = useMemo(() => {
    const processingCounts = savedMonthlyItems.reduce<Counts>(
      (result, item) => {
        if (item.state === "procesando") result[item.category] += 1;
        return result;
      },
      { fibra: 0, luz: 0, gas: 0 },
    );

    return estimateCommission({
      model: commissionModel,
      fibra: processingCounts.fibra,
      luz: processingCounts.luz,
      gas: processingCounts.gas,
    }).total;
  }, [savedMonthlyItems, commissionModel]);

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

      // Restore the complete current-month record. Every saved box stays
      // selected regardless of whether it is processing, finalized, or rejected.
      const activeEntry = normalizedEntries.find(
        (entry) => entry.monthKey === getMonthKey(),
      );

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

        const savedCounts = activeEntry.items.reduce(
          (result, item) => {
            if (item.state !== "rechazado") {
              result[item.category] += 1;
            }
            return result;
          },
          { fibra: 0, luz: 0, gas: 0 } as Counts,
        );

        setCounts(savedCounts);
        setDraftItems(activeEntry.items);
      } else {
        setCounts({ fibra: 0, luz: 0, gas: 0 });
        setDraftItems([]);
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
    if (hasMonthlyEntry) return;

    setPlanId(next);
    setCounts({ fibra: 0, luz: 0, gas: 0 });
    setDraftItems([]);
    setExtraBoxes({ fibra: 0, luz: 0, gas: 0 });
    setError("");
  }

  function addExtraBox(key: keyof Counts) {
    const selectedSuccessful = draftItems.filter(
      (item) => item.category === key && item.state !== "rechazado",
    ).length;

    if (selectedSuccessful < targets[key]) return;

    setExtraBoxes((current) => ({
      ...current,
      [key]: current[key] + 1,
    }));
  }

  function toggleSale(key: keyof Counts, index: number) {
    if (index > availableTargets[key]) return;

    // Saved monthly boxes are locked. This includes processing, finalized,
    // and rejected sales. A rejected box stays red/locked; the replacement
    // is a new box number made available by availableTargets.
    const isSaved = savedMonthlyItems.some(
      (item) => item.category === key && item.index === index,
    );

    if (isSaved) return;

    const existsInDraft = draftItems.some(
      (item) => item.category === key && item.index === index,
    );

    const nextItems = existsInDraft
      ? draftItems.filter(
          (item) => !(item.category === key && item.index === index),
        )
      : addSequentialDraftItems(
          draftItems,
          savedMonthlyItems,
          key,
          index,
        );

    const sortedItems = sortItems(nextItems);

    setDraftItems(sortedItems);
    setCounts(countsFromItems(sortedItems));
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
    if (hasMonthlyEntry) return;

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
          items: draftItems,

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

      // Keep exactly one database record for the current month.
      // Saving again replaces that month's local copy instead of adding a
      // second card/entry. Existing boxes remain selected.
      setEntries((current) => {
        const withoutCurrentMonth = current.filter(
          (entry) => entry.monthKey !== currentMonth,
        );
        return [savedEntry, ...withoutCurrentMonth];
      });

      // The API returns the complete monthly item list, so restore the full
      // item list after every save. Nothing is cleared from the registration form.
      setDraftItems(savedEntry.items ?? []);
      setCounts(savedEntry.counts);

      // Create the downloadable progress image from the complete monthly record.
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
                    hasMonthlyEntry && "cursor-not-allowed opacity-70",
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
            category="fibra"
            label="Fibra"
            target={targets.fibra}
            boxCount={availableTargets.fibra}
            items={draftItems.filter((item) => item.category === "fibra")}
            savedItems={savedMonthlyItems.filter(
              (item) => item.category === "fibra",
            )}
            onToggle={(index) => toggleSale("fibra", index)}
            onAddBox={() => addExtraBox("fibra")}
          />

          <Counter
            category="luz"
            label="Luz"
            target={targets.luz}
            boxCount={availableTargets.luz}
            items={draftItems.filter((item) => item.category === "luz")}
            savedItems={savedMonthlyItems.filter(
              (item) => item.category === "luz",
            )}
            onToggle={(index) => toggleSale("luz", index)}
            onAddBox={() => addExtraBox("luz")}
          />

          <Counter
            category="gas"
            label="Gas"
            target={targets.gas}
            boxCount={availableTargets.gas}
            items={draftItems.filter((item) => item.category === "gas")}
            savedItems={savedMonthlyItems.filter(
              (item) => item.category === "gas",
            )}
            onToggle={(index) => toggleSale("gas", index)}
            onAddBox={() => addExtraBox("gas")}
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
            : hasMonthlyEntry
              ? `Añadir ventas · €${liveEstimate.toFixed(2)} aprox.`
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
                  Ventas activas
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

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        En proceso
                      </span>
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

                      <StatusPill status="finalizado" />
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
