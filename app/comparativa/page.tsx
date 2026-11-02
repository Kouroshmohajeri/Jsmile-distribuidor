"use client";

import "./comparativa.css";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { IBERDROLA_OFFERS, type Tariff } from "@/lib/offers";
import {
  calculateAllOffers,
  type ComparadorInput,
  type OfferResult,
} from "@/lib/calculator";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const CALC_DURATION_MS = 1000;
const CALC_MESSAGES = [
  "Aplicando precios por periodo...",
  "Calculando potencia e impuestos...",
  "Comparando ofertas compatibles...",
];

const money = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

function Field({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  min?: number;
  step?: string;
}) {
  return (
    <label className="cmp-field">
      <span className="cmp-field-label">{label}</span>
      <span className="cmp-input-wrap">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="cmp-input"
        />
        {suffix && <span className="cmp-input-suffix">{suffix}</span>}
      </span>
    </label>
  );
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cmp-group">
      <div>
        <h2>{title}</h2>
        {description && <p className="cmp-group-desc">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Counts a figure up from 0, writing to the DOM directly (no re-renders). */
function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduced) {
      element.textContent = money(value);
      return;
    }
    element.textContent = money(0);
    const controls = animate(0, value, {
      duration: 0.7,
      delay,
      ease: EASE_OUT,
      onUpdate: (latest: number) => {
        element.textContent = money(latest);
      },
    });
    return () => controls.stop();
  }, [value, delay, reduced]);

  return <span ref={ref}>{money(value)}</span>;
}

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: EASE_OUT },
  },
};

function getOfferPriority(name: string) {
  const value = name.toLowerCase();
  if (
    value.includes("ahorro inteligente") ||
    value.includes("inteligente 8 horas")
  )
    return 1;
  if (value.includes("impulso 24") || value.includes("impulsa 24")) return 2;
  if (
    value.includes("tranquilidad plus") ||
    value.includes("supertranquilidad")
  )
    return 3;
  return 100;
}

function getDisplayOfferName(name: string) {
  const value = name.toLowerCase();
  if (value.includes("ahorro inteligente") && value.includes("8 horas"))
    return "Inteligente 8 horas";
  if (value.includes("impulso 24") || value.includes("impulsa 24"))
    return "Impulso 24h";
  if (
    value.includes("tranquilidad plus") ||
    value.includes("supertranquilidad")
  )
    return "Supertranquilidad";
  return name;
}

const PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;

type FormState = Record<string, string>;

const initial: FormState = {
  potenciaP1: "",
  potenciaP2: "",
  potenciaP3: "",
  potenciaP4: "",
  potenciaP5: "",
  potenciaP6: "",
  consumoP1: "",
  consumoP2: "",
  consumoP3: "",
  consumoP4: "",
  consumoP5: "",
  consumoP6: "",
  perfilP1: "20",
  perfilP2: "80",
  perfilP3: "0",
  perfilP4: "0",
  perfilP5: "0",
  perfilP6: "0",
  usarPerfil: "true",
  iva: "21",
  ie: "5.113",
  diasFactura: "",
  reactivaBonoSocial: "0",
  otrosConceptos: "0",
  alquilerEquipo: "0",
  excesosPotencia: "0",
  otrosDescuentos: "0",
  otrosCashbacks: "0",
  totalFacturaActual: "",
};

function detectTariff(form: FormState): Tariff | null {
  const powers = PERIODS.map((period) =>
    Number(form[`potencia${period}`] || 0),
  );
  if (powers.every((value) => value <= 0)) return null;

  const maxPower = Math.max(...powers);
  if (maxPower <= 10) return "2.0TD_2";
  if (maxPower <= 15) return "2.0TD_3";

  // A 6-period invoice is treated as 6.1TD when the workbook offers it;
  // otherwise it remains 3.0TD.
  const hasHigherPeriods = powers.slice(2).some((value) => value > 0);
  return hasHigherPeriods ? "6.1TD" : "3.0TD";
}

function tariffParts(tariff: Tariff | null): [string, string | null] | null {
  if (!tariff) return null;
  if (tariff === "2.0TD_2") return ["2.0 TD", "hasta 10 kW"];
  if (tariff === "2.0TD_3") return ["2.0 TD", "más de 10 kW y hasta 15 kW"];
  if (tariff === "3.0TD") return ["3.0 TD", "más de 15 kW"];
  return ["6.1 TD", null];
}

/** Plain label, used by the share image. */
function tariffLabel(tariff: Tariff | null) {
  const parts = tariffParts(tariff);
  if (!parts) return "";
  return parts[1] ? `${parts[0]} · ${parts[1]}` : parts[0];
}

function TariffChip({ tariff }: { tariff: Tariff | null }) {
  const parts = tariffParts(tariff);
  return (
    <AnimatePresence mode="wait" initial={false}>
      {parts && (
        <motion.p
          key={tariff}
          className="cmp-chip"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
        >
          <span>Tarifa detectada</span>
          <strong>{parts[0]}</strong>
          {parts[1] && <span>{parts[1]}</span>}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export default function ComparativaPage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calcMessage, setCalcMessage] = useState(CALC_MESSAGES[0]);
  const [runId, setRunId] = useState(0);
  const [selectedOffer, setSelectedOffer] = useState<OfferResult | null>(null);
  const [selectedSnapshotOffers, setSelectedSnapshotOffers] = useState<
    string[]
  >([]);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState("");
  const calcTimers = useRef<number[]>([]);

  const clearCalcTimers = () => {
    calcTimers.current.forEach((timer) => window.clearTimeout(timer));
    calcTimers.current = [];
  };

  useEffect(() => () => clearCalcTimers(), []);

  useEffect(() => {
    if (!selectedOffer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedOffer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedOffer]);

  const update = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
  };

  const tariff = useMemo(() => detectTariff(form), [form]);

  const parsed = useMemo<ComparadorInput | null>(() => {
    const n = (key: string) => Number(form[key]);
    const periods = PERIODS.map((period) => n(`potencia${period}`));
    const consumption = PERIODS.map((period) => n(`consumo${period}`));
    const profile = [0.2, 0.8, 0, 0, 0, 0];
    if (!tariff) return null;
    for (const period of ["P1", "P2"] as const) {
      if (
        form[`potencia${period}`] === "" ||
        !Number.isFinite(n(`potencia${period}`))
      )
        return null;
    }
    for (const period of ["P1", "P2", "P3"] as const) {
      if (
        form[`consumo${period}`] === "" ||
        !Number.isFinite(n(`consumo${period}`))
      )
        return null;
    }
    if (form.diasFactura === "" || form.totalFacturaActual === "") return null;
    if (
      !Number.isFinite(n("diasFactura")) ||
      !Number.isFinite(n("totalFacturaActual"))
    )
      return null;

    return {
      tariff,
      potencia: periods as ComparadorInput["potencia"],
      consumo: consumption as ComparadorInput["consumo"],
      perfil: profile as ComparadorInput["perfil"],
      usarPerfil: form.usarPerfil !== "false",
      iva: n("iva") / 100,
      ie: n("ie") / 100,
      diasFactura: n("diasFactura"),
      reactivaBonoSocial: n("reactivaBonoSocial") || 0,
      otrosConceptos: n("otrosConceptos") || 0,
      alquilerEquipo: n("alquilerEquipo") || 0,
      excesosPotencia: n("excesosPotencia") || 0,
      otrosDescuentos: n("otrosDescuentos") / 100 || 0,
      otrosCashbacks: n("otrosCashbacks") || 0,
      totalFacturaActual: n("totalFacturaActual"),
    };
  }, [form, tariff]);

  const results = useMemo(() => {
    if (!submitted || !parsed) return [];
    const compatibleOffers = IBERDROLA_OFFERS.filter(
      (offer) => offer.tariff === parsed.tariff,
    );
    return calculateAllOffers(parsed, compatibleOffers)
      .filter((result) => getOfferPriority(result.offerName) < 100)
      .sort((a, b) => {
        const priorityA = getOfferPriority(a.offerName);
        const priorityB = getOfferPriority(b.offerName);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.offerName.localeCompare(b.offerName, "es");
      });
  }, [submitted, parsed]);

  const currentBill = parsed?.totalFacturaActual ?? 0;
  const barMax = Math.max(currentBill, ...results.map((r) => r.total), 1);
  const bestOfferId = useMemo(() => {
    const best = results.reduce<OfferResult | null>(
      (top, r) => (r.saving > 0 && (!top || r.saving > top.saving) ? r : top),
      null,
    );
    return best?.offerId ?? null;
  }, [results]);

  const canCalculate =
    parsed !== null &&
    Number(form.iva) >= 0 &&
    Number(form.ie) >= 0 &&
    Number(form.diasFactura) > 0;

  const scrollToResults = () =>
    window.setTimeout(
      () =>
        document
          .getElementById("comparativa-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60,
    );

  function handleCalculate() {
    clearCalcTimers();
    setSelectedOffer(null);
    setSelectedSnapshotOffers([]);
    setSubmitted(false);

    const reveal = () => {
      setCalculating(false);
      setSubmitted(true);
      setRunId((id) => id + 1);
    };

    if (reduced) {
      reveal();
      scrollToResults();
      return;
    }

    setCalculating(true);
    setCalcMessage(CALC_MESSAGES[0]);
    scrollToResults();
    const step = CALC_DURATION_MS / CALC_MESSAGES.length;
    CALC_MESSAGES.slice(1).forEach((message, index) => {
      calcTimers.current.push(
        window.setTimeout(() => setCalcMessage(message), step * (index + 1)),
      );
    });
    calcTimers.current.push(window.setTimeout(reveal, CALC_DURATION_MS));
  }

  async function handleSnapshot() {
    if (!results.length || !parsed) return;
    const snapshotResults = selectedSnapshotOffers.length
      ? results.filter((result) =>
          selectedSnapshotOffers.includes(result.offerName),
        )
      : results.slice(0, 3);
    if (!snapshotResults.length) return;

    setCreatingSnapshot(true);
    setSnapshotError("");
    try {
      const canvas = document.createElement("canvas");
      const padding = 42;
      const rowHeight = 62;
      const headerHeight = 112;
      const tableHeaderHeight = 42;
      const footerHeight = 42;
      const width = 1400;
      const height =
        padding * 2 +
        headerHeight +
        tableHeaderHeight +
        snapshotResults.length * rowHeight +
        footerHeight +
        14;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context is not available");

      ctx.fillStyle = "#f5f6f9";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(padding, padding, width - padding * 2, height - padding * 2);
      ctx.fillStyle = "#12141c";
      ctx.font = "700 28px Arial";
      ctx.fillText("Comparativa de tarifas", padding + 28, padding + 38);
      ctx.fillStyle = "#667085";
      ctx.font = "400 15px Arial";
      ctx.fillText(
        `Planes Iberdrola · ${tariffLabel(parsed.tariff)}`,
        padding + 28,
        padding + 68,
      );

      const tableY = padding + headerHeight;
      ctx.fillStyle = "#11183c";
      ctx.fillRect(
        padding + 20,
        tableY,
        width - padding * 2 - 40,
        tableHeaderHeight,
      );
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 13px Arial";
      const cols = [
        padding + 38,
        padding + 90,
        padding + 760,
        padding + 1030,
        padding + 1220,
      ];
      ["#", "PLAN", "TARIFA", "PRECIO / AÑO", "AHORRO"].forEach((text, index) =>
        ctx.fillText(text, cols[index], tableY + 27),
      );

      snapshotResults.forEach((result, index) => {
        const y = tableY + tableHeaderHeight + index * rowHeight;
        ctx.fillStyle = index % 2 ? "#fafbfc" : "#ffffff";
        ctx.fillRect(padding + 20, y, width - padding * 2 - 40, rowHeight);
        ctx.fillStyle = "#12141c";
        ctx.font = "700 15px Arial";
        ctx.fillText(String(index + 1), cols[0], y + rowHeight / 2);
        ctx.fillText(
          getDisplayOfferName(result.offerName),
          cols[1],
          y + rowHeight / 2,
        );
        ctx.font = "400 14px Arial";
        ctx.fillText(result.tariff, cols[2], y + rowHeight / 2);
        ctx.fillText(money(result.total), cols[3], y + rowHeight / 2);
        ctx.fillStyle = result.saving > 0 ? "#087f5b" : "#98a0ad";
        ctx.font = "700 15px Arial";
        ctx.fillText(
          result.saving > 0 ? money(result.saving) : "—",
          cols[4],
          y + rowHeight / 2,
        );
      });

      ctx.fillStyle = "#98a0ad";
      ctx.font = "400 11px Arial";
      ctx.fillText(
        "Estimación orientativa · jsmile",
        padding + 20,
        height - padding - 15,
      );
      sessionStorage.setItem(
        "jsmile_share_snapshot",
        canvas.toDataURL("image/jpeg", 0.86),
      );
      sessionStorage.setItem(
        "jsmile_share_selected_offers",
        JSON.stringify(snapshotResults.map((result) => result.offerName)),
      );
      router.push("/compartir");
    } catch (error) {
      console.error(error);
      setSnapshotError("No se ha podido crear la imagen. Inténtalo de nuevo.");
    } finally {
      setCreatingSnapshot(false);
    }
  }

  const showResults = calculating || submitted;

  return (
    <div className="cmp">
      <header className="cmp-topbar">
        <div className="cmp-container cmp-topbar-inner">
          <button
            type="button"
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/")
            }
            className="cmp-btn cmp-btn--quiet"
          >
            <BackIcon />
            <span>Volver</span>
          </button>
          <p className="cmp-wordmark">
            jsmile<span>.es</span>
          </p>
        </div>
      </header>

      <main className="cmp-container pb-24 pt-10">
        <div className="mb-8 max-w-2xl">
          <h1>Comparativa Iberdrola</h1>
          <p className="cmp-muted mt-3">
            Introduce los datos de la factura actual para calcular las ofertas
            Iberdrola compatibles con la potencia contratada.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="cmp-sheet">
            <Group
              title="Potencia contratada"
              description="Indica la potencia contratada en cada periodo."
            >
              <div className="cmp-fields">
                {(["P1", "P2"] as const).map((period) => (
                  <Field
                    key={period}
                    label={`Potencia ${period}`}
                    value={form[`potencia${period}`]}
                    onChange={(value) => update(`potencia${period}`, value)}
                    suffix="kW"
                  />
                ))}
              </div>
              <div className="mt-4 min-h-9">
                <TariffChip tariff={tariff} />
              </div>
            </Group>

            <Group
              title="Consumo"
              description="Introduce el consumo de la factura en cada periodo."
            >
              <div className="cmp-fields">
                {(["P1", "P2", "P3"] as const).map((period) => (
                  <Field
                    key={period}
                    label={`Consumo ${period}`}
                    value={form[`consumo${period}`]}
                    onChange={(value) => update(`consumo${period}`, value)}
                    suffix="kWh"
                  />
                ))}
              </div>
            </Group>

            <Group
              title="Datos de la factura"
              description="Introduce los importes del periodo facturado."
            >
              <div className="cmp-fields">
                <Field
                  label="Días facturados"
                  value={form.diasFactura}
                  onChange={(value) => update("diasFactura", value)}
                  suffix="días"
                  step="1"
                />
                <Field
                  label="Total factura actual"
                  value={form.totalFacturaActual}
                  onChange={(value) => update("totalFacturaActual", value)}
                  suffix="€"
                />
                <Field
                  label="Reactiva / Bono Social"
                  value={form.reactivaBonoSocial}
                  onChange={(value) => update("reactivaBonoSocial", value)}
                  suffix="€"
                />
                <Field
                  label="Otros conceptos"
                  value={form.otrosConceptos}
                  onChange={(value) => update("otrosConceptos", value)}
                  suffix="€"
                />
                <Field
                  label="Alquiler equipo"
                  value={form.alquilerEquipo}
                  onChange={(value) => update("alquilerEquipo", value)}
                  suffix="€"
                />
              </div>
            </Group>

            <Group
              title="Impuestos"
              description="Introduce los porcentajes que aparecen en la factura."
            >
              <div className="cmp-fields">
                <Field
                  label="IVA / IGIC"
                  value={form.iva}
                  onChange={(value) => update("iva", value)}
                  suffix="%"
                />
                <Field
                  label="Impuesto eléctrico (IE)"
                  value={form.ie}
                  onChange={(value) => update("ie", value)}
                  suffix="%"
                />
              </div>
            </Group>

            <Group
              title="Perfil de consumo"
              description="Perfil fijo aplicado a las ofertas de dos precios."
            >
              <div className="cmp-split" role="img" aria-label="P1 20%, P2 80%">
                <div style={{ flexBasis: "20%" }}>
                  <span>P1</span>
                  <span>20%</span>
                </div>
                <div style={{ flexBasis: "80%" }}>
                  <span>P2</span>
                  <span>80%</span>
                </div>
              </div>
            </Group>
          </div>

          <aside className="cmp-sheet cmp-aside">
            <h2>Resumen</h2>
            <dl className="cmp-summary">
              <div>
                <dt>Tarifa</dt>
                <dd>{tariffParts(tariff)?.[0] ?? "Sin detectar"}</dd>
              </div>
              <div>
                <dt>Días facturados</dt>
                <dd>{form.diasFactura || "Sin indicar"}</dd>
              </div>
              <div>
                <dt>Total factura actual</dt>
                <dd>
                  {form.totalFacturaActual
                    ? money(Number(form.totalFacturaActual))
                    : "Sin indicar"}
                </dd>
              </div>
              {submitted && (
                <div>
                  <dt>Ofertas compatibles</dt>
                  <dd>{results.length}</dd>
                </div>
              )}
            </dl>

            <motion.button
              type="button"
              disabled={!canCalculate || calculating}
              aria-busy={calculating}
              onClick={handleCalculate}
              whileTap={canCalculate && !calculating ? { scale: 0.98 } : {}}
              transition={{ duration: 0.12 }}
              className="cmp-btn cmp-btn--primary relative w-full overflow-hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={calculating ? "busy" : "idle"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {calculating ? "Calculando..." : "Calcular comparativa"}
                </motion.span>
              </AnimatePresence>
              {calculating && (
                <motion.span
                  className="cmp-btn-progress"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: CALC_DURATION_MS / 1000,
                    ease: "linear",
                  }}
                />
              )}
            </motion.button>
            {!canCalculate && (
              <p className="cmp-muted mt-3 text-sm">
                Completa potencia, consumo, días facturados y total para
                calcular.
              </p>
            )}
          </aside>
        </div>

        {showResults && (
          <section
            id="comparativa-results"
            className="mt-14 scroll-mt-6"
            aria-live="polite"
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="cmp-title-lg">Ofertas compatibles</h2>
                <p className="cmp-muted mt-2 text-sm">
                  Los importes se calculan con la estructura de periodos y
                  reglas del nuevo modelo Excel.
                </p>
              </div>
              {submitted && results.length > 0 && (
                <button
                  type="button"
                  onClick={handleSnapshot}
                  disabled={creatingSnapshot}
                  aria-busy={creatingSnapshot}
                  className="cmp-btn cmp-btn--secondary"
                >
                  {creatingSnapshot
                    ? "Creando imagen..."
                    : "Compartir comparativa"}
                </button>
              )}
            </div>

            {snapshotError && (
              <p className="cmp-notice cmp-notice--error mb-4" role="alert">
                {snapshotError}
              </p>
            )}

            <AnimatePresence mode="wait">
              {calculating && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                >
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={calcMessage}
                      className="cmp-muted mb-4 text-sm"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {calcMessage}
                    </motion.p>
                  </AnimatePresence>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="cmp-row" aria-hidden="true">
                      <div className="cmp-row-main">
                        <div>
                          <div className="cmp-skel h-4 w-40" />
                          <div className="cmp-skel mt-2 h-3 w-24" />
                        </div>
                        <div className="cmp-metrics">
                          {[0, 1, 2, 3].map((j) => (
                            <div key={j} className="cmp-skel h-5 w-20" />
                          ))}
                        </div>
                      </div>
                      <div className="cmp-skel mt-5 h-1.5 w-full" />
                    </div>
                  ))}
                </motion.div>
              )}

              {submitted && results.length > 0 && (
                <motion.div
                  key={`results-${runId}`}
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div
                    variants={rowVariants}
                    className="cmp-legend mb-4"
                  >
                    <span>
                      <span className="cmp-legend-mark" aria-hidden="true" />
                      Factura actual{" "}
                      <strong className="cmp-num text-(--color-ink)">
                        {money(currentBill)}
                      </strong>
                    </span>
                  </motion.div>

                  <div className="cmp-results-head" aria-hidden="true">
                    <span>Oferta</span>
                    <span>Total</span>
                    <span>Ahorro</span>
                    <span>Ahorro anual</span>
                    <span>Energía</span>
                  </div>

                  {results.map((result, index) => {
                    const selected = selectedSnapshotOffers.includes(
                      result.offerName,
                    );
                    const delay = 0.1 + index * 0.05;
                    const good = result.saving > 0;
                    return (
                      <motion.article
                        key={result.offerId}
                        variants={rowVariants}
                        className="cmp-row"
                        data-selected={selected}
                      >
                        <div className="cmp-row-main">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3>{getDisplayOfferName(result.offerName)}</h3>
                              {result.offerId === bestOfferId && (
                                <span className="cmp-tag">Mayor ahorro</span>
                              )}
                            </div>
                            <p className="cmp-muted mt-1 flex flex-wrap gap-x-3 text-xs">
                              <span>{result.tariff}</span>
                              <span>{result.duration}</span>
                            </p>
                            {result.discountText && (
                              <p className="mt-2 text-xs leading-5 text-(--color-ink-2)">
                                {result.discountText}
                              </p>
                            )}
                          </div>

                          <div className="cmp-metrics">
                            <div>
                              <span className="cmp-cell-label">Total</span>
                              <p className="cmp-metric">
                                <CountUp value={result.total} delay={delay} />
                              </p>
                            </div>
                            <div>
                              <span className="cmp-cell-label">Ahorro</span>
                              <p
                                className={`cmp-metric ${good ? "cmp-metric--good" : "cmp-metric--none"}`}
                              >
                                {good ? (
                                  <CountUp
                                    value={result.saving}
                                    delay={delay}
                                  />
                                ) : (
                                  "—"
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="cmp-cell-label">
                                Ahorro anual
                              </span>
                              <p
                                className={`cmp-metric ${result.annualSaving > 0 ? "cmp-metric--good" : "cmp-metric--none"}`}
                              >
                                {result.annualSaving > 0 ? (
                                  <CountUp
                                    value={result.annualSaving}
                                    delay={delay}
                                  />
                                ) : (
                                  "—"
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="cmp-cell-label">Energía</span>
                              <p className="cmp-metric">
                                <CountUp value={result.energy} delay={delay} />
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className="cmp-billbar"
                          role="img"
                          aria-label={`${money(result.total)} frente a ${money(currentBill)} de la factura actual`}
                        >
                          <motion.div
                            className="cmp-billbar-fill"
                            data-good={good}
                            initial={{
                              scaleX: reduced ? result.total / barMax : 0,
                            }}
                            animate={{ scaleX: result.total / barMax }}
                            transition={{
                              duration: 0.7,
                              delay,
                              ease: EASE_OUT,
                            }}
                          />
                          <span
                            className="cmp-billbar-mark"
                            style={{ left: `${(currentBill / barMax) * 100}%` }}
                          />
                        </div>

                        <div className="cmp-row-actions">
                          <button
                            type="button"
                            onClick={() => setSelectedOffer(result)}
                            className="cmp-btn cmp-btn--secondary"
                          >
                            Ver detalle
                          </button>
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setSelectedSnapshotOffers((current) =>
                                current.includes(result.offerName)
                                  ? current.filter(
                                      (name) => name !== result.offerName,
                                    )
                                  : [...current, result.offerName],
                              )
                            }
                            className="cmp-btn cmp-btn--secondary"
                          >
                            {selected
                              ? "Quitar de compartir"
                              : "Añadir a compartir"}
                          </button>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
              )}

              {submitted && results.length === 0 && (
                <motion.p
                  key="empty"
                  className="cmp-notice cmp-notice--warn"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                >
                  No hay ofertas compatibles con la tarifa detectada. Revisa los
                  periodos de potencia y consumo y comprueba que los datos de la
                  factura estén completos.
                </motion.p>
              )}
            </AnimatePresence>
          </section>
        )}
      </main>

      <AnimatePresence>
        {selectedOffer && (
          <motion.div
            className="cmp-scrim"
            onClick={() => setSelectedOffer(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cmp-detail-title"
              className="cmp-dialog"
              onClick={(event: React.MouseEvent) => event.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.99 }}
              transition={{ duration: 0.26, ease: EASE_OUT }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="cmp-detail-title" className="cmp-title-lg">
                    {getDisplayOfferName(selectedOffer.offerName)}
                  </h2>
                  <p className="cmp-muted mt-1 text-sm">
                    {selectedOffer.tariff}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOffer(null)}
                  className="cmp-btn cmp-btn--quiet"
                >
                  Cerrar
                </button>
              </div>
              <dl className="cmp-dl">
                {[
                  ...(["P1", "P2", "P3"] as const).map((period, index) => {
                    const offer = IBERDROLA_OFFERS.find(
                      (item) => item.id === selectedOffer.offerId,
                    );
                    const price = offer?.energyPrices[index];
                    return [
                      `Precio energía ${period}`,
                      price == null
                        ? "No aplicable"
                        : `${price.toLocaleString("es-ES", { minimumFractionDigits: 4, maximumFractionDigits: 6 })} €/kWh`,
                    ];
                  }),
                  [
                    "Energía antes de descuento",
                    money(selectedOffer.energyBeforeDiscount),
                  ],
                  ["Energía", money(selectedOffer.energy)],
                  [
                    "Potencia antes de descuento",
                    money(selectedOffer.powerBeforeDiscount),
                  ],
                  ["Potencia", money(selectedOffer.power)],
                  ["Impuesto eléctrico", money(selectedOffer.electricityTax)],
                  ["Pack neto", money(selectedOffer.packNet)],
                  ["IVA / IGIC", money(selectedOffer.iva)],
                  ["Total", money(selectedOffer.total)],
                  ["Ahorro", money(selectedOffer.saving)],
                  ["Ahorro anual", money(selectedOffer.annualSaving)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    data-strong={label === "Total" || label === "Ahorro anual"}
                  >
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {selectedOffer.discountText && (
                <p className="cmp-muted mt-5 text-xs leading-5">
                  {selectedOffer.discountText}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
