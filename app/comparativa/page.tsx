"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { IBERDROLA_OFFERS, type Tariff } from "@/lib/offers";
import {
  calculateAllOffers,
  type ComparadorInput,
  type OfferResult,
} from "@/lib/calculator";
import InvoiceImporter from "../components/InvoiceImporter";

function Field({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = "0.01",
  dataAiKey,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  min?: number;
  step?: string;
  dataAiKey?: string;
}) {
  return (
    <label
      data-ai-key={dataAiKey}
      className="block transition-all duration-300"
    >
      <span className="mb-2 block text-sm font-semibold text-[#12141c]">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1b2559] focus:ring-2 focus:ring-[#1b2559]/10"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#858995]">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-[0_12px_35px_rgba(18,20,28,.055)] sm:p-6">
      <h2 className="text-lg font-extrabold text-[#12141c]">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-[#777b87]">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

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

function OfferIcon({ offerName }: { offerName: string }) {
  const name = offerName.toLowerCase();
  const path = name.includes("tranquilidad")
    ? "M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z"
    : name.includes("ahorro")
      ? "M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5"
      : "M13 2L4 14h7l-1 8 9-12h-7l1-8Z";
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
type PeriodKey = (typeof PERIODS)[number];

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
  perfilP1: "55",
  perfilP2: "45",
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

function tariffLabel(tariff: Tariff | null) {
  if (!tariff) return "";
  if (tariff === "2.0TD_2") return "2.0 TD · hasta 10 kW";
  if (tariff === "2.0TD_3") return "2.0 TD · más de 10 kW y hasta 15 kW";
  if (tariff === "3.0TD") return "3.0 TD · más de 15 kW";
  return "6.1 TD";
}

function requiredPeriods(tariff: Tariff | null) {
  if (tariff === "6.1TD") return 6;
  if (tariff === "3.0TD") return 6;
  return 2;
}

export default function ComparativaPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<OfferResult | null>(null);
  const [selectedSnapshotOffers, setSelectedSnapshotOffers] = useState<
    string[]
  >([]);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState("");
  const [aiFilling, setAiFilling] = useState(false);
  const [aiFilledKeys, setAiFilledKeys] = useState<string[]>([]);
  const [aiMessage, setAiMessage] = useState("Analizando tu factura...");
  const aiTimers = useRef<number[]>([]);

  const clearAiTimers = () => {
    aiTimers.current.forEach((timer) => window.clearTimeout(timer));
    aiTimers.current = [];
  };

  useEffect(() => () => clearAiTimers(), []);

  const update = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
  };

  const runAiFillAnimation = (fields: Record<string, unknown>) => {
    clearAiTimers();

    // Accept both the old invoice-parser names and the new P1..P6 names.
    const normalized: Record<string, unknown> = { ...fields };
    PERIODS.forEach((period) => {
      const powerKey = `potencia${period}`;
      const consumptionKey = `consumo${period}`;
      const profileKey = `perfil${period}`;
      if (normalized[powerKey] == null && normalized[`power${period}`] != null)
        normalized[powerKey] = normalized[`power${period}`];
      if (
        normalized[consumptionKey] == null &&
        normalized[`consumption${period}`] != null
      )
        normalized[consumptionKey] = normalized[`consumption${period}`];
      if (
        normalized[profileKey] == null &&
        normalized[`profile${period}`] != null
      )
        normalized[profileKey] = normalized[`profile${period}`];
    });

    const order = [
      ...PERIODS.map((period) => `potencia${period}`),
      ...PERIODS.map((period) => `consumo${period}`),
      ...PERIODS.map((period) => `perfil${period}`),
      "iva",
      "ie",
      "diasFactura",
      "totalFacturaActual",
      "reactivaBonoSocial",
      "otrosConceptos",
      "alquilerEquipo",
      "excesosPotencia",
      "otrosDescuentos",
      "otrosCashbacks",
    ];

    const keys = order.filter(
      (key) =>
        normalized[key] !== undefined &&
        normalized[key] !== null &&
        normalized[key] !== "",
    );
    setAiFilling(true);
    setAiFilledKeys([]);
    setAiMessage("Analizando tu factura...");

    keys.forEach((key, index) => {
      const timer = window.setTimeout(
        () => {
          setForm((current) => ({
            ...current,
            [key]: String(normalized[key]),
          }));
          setAiFilledKeys((current) => [...current, key]);
          if (index < Math.ceil(keys.length * 0.45))
            setAiMessage("Identificando datos de la factura...");
          else if (index < Math.ceil(keys.length * 0.82))
            setAiMessage("Comprobando consumos e importes...");
          else setAiMessage("Verificando los últimos campos...");
          if (index === keys.length - 1) {
            const finishTimer = window.setTimeout(() => {
              setAiMessage("Factura procesada correctamente");
              setAiFilling(false);
            }, 650);
            aiTimers.current.push(finishTimer);
          }
        },
        250 + index * 70,
      );
      aiTimers.current.push(timer);
    });
  };

  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>("[data-ai-key]")
      .forEach((element) => {
        const key = element.dataset.aiKey;
        element.dataset.aiFilled =
          key && aiFilledKeys.includes(key) ? "true" : "false";
      });
  }, [aiFilledKeys]);

  const tariff = useMemo(() => detectTariff(form), [form]);

  const parsed = useMemo<ComparadorInput | null>(() => {
    const n = (key: string) => Number(form[key]);
    const periods = PERIODS.map((period) => n(`potencia${period}`));
    const consumption = PERIODS.map((period) => n(`consumo${period}`));
    const profile = PERIODS.map((period) => n(`perfil${period}`) / 100);
    const required = requiredPeriods(tariff);

    if (!tariff) return null;
    for (let index = 0; index < required; index++) {
      if (
        !Number.isFinite(periods[index]) ||
        !Number.isFinite(consumption[index])
      )
        return null;
      if (
        form[`potencia${PERIODS[index]}`] === "" ||
        form[`consumo${PERIODS[index]}`] === ""
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

  const profileTotal = PERIODS.reduce(
    (sum, period) => sum + Number(form[`perfil${period}`] || 0),
    0,
  );
  const validProfile = !form.usarPerfil || Math.abs(profileTotal - 100) < 0.001;

  const results = useMemo(() => {
    if (!submitted || !parsed) return [];
    const compatibleOffers = IBERDROLA_OFFERS.filter(
      (offer) => offer.tariff === parsed.tariff,
    );
    return calculateAllOffers(parsed, compatibleOffers).sort((a, b) => {
      const priorityA = getOfferPriority(a.offerName);
      const priorityB = getOfferPriority(b.offerName);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.offerName.localeCompare(b.offerName, "es");
    });
  }, [submitted, parsed]);

  const canCalculate =
    parsed !== null &&
    validProfile &&
    Number(form.iva) >= 0 &&
    Number(form.ie) >= 0 &&
    Number(form.diasFactura) > 0;

  const money = (value: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);

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

  return (
    <>
      <main
        className={`relative min-h-screen overflow-hidden bg-[#f5f6f9] px-4 py-8 text-[#12141c] sm:px-6 ${aiFilling ? "ai-filling-page" : ""}`}
      >
        {aiFilling && (
          <>
            <div className="fixed inset-0 z-40 bg-white/60 backdrop-blur-md" />
            <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-[#e8eaf0]">
              <div className="ai-progress-bar h-full rounded-full bg-[#11183c]" />
            </div>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6">
              <div className="w-full max-w-sm rounded-3xl border border-[#e4e6ec] bg-white px-6 py-7 text-center shadow-[0_30px_100px_rgba(18,20,28,.16)]">
                <div className="mx-auto h-44 w-44">
                  <DotLottieReact
                    src="https://lottie.host/6690e4d4-cfa1-4cc4-a69f-26f59a67a894/Aaae80lNoL.lottie"
                    loop
                    autoplay
                  />
                </div>
                <p className="text-lg font-extrabold text-[#12141c]">
                  Estamos revisando tu factura
                </p>
                <p className="mt-2 text-sm leading-5 text-[#777b87]">
                  {aiMessage}
                </p>
                <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full bg-[#f5f6f9] px-3 py-1.5 text-xs font-bold text-[#5b5f6b]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#11183c]" />
                  {aiFilledKeys.length
                    ? `${aiFilledKeys.length} datos identificados`
                    : "Analizando factura..."}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/")
            }
            className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[#5b5f6b] transition hover:bg-white hover:text-[#12141c]"
          >
            ← Volver
          </button>

          <div className="mb-8">
            <p className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-[#8a7b4f]">
              jsmile.es
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Comparativa Iberdrola
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777b87]">
              Introduce los datos de la factura actual para calcular las ofertas
              Iberdrola compatibles con la potencia contratada.
            </p>
          </div>

          <InvoiceImporter
            onExtracted={(fields) => {
              setSubmitted(false);
              setSelectedOffer(null);
              runAiFillAnimation(fields as unknown as Record<string, unknown>);
            }}
          />

          <div
            className={`mt-5 grid gap-5 lg:grid-cols-2 transition-all duration-700 ${aiFilling ? "ai-form-active" : ""}`}
          >
            <Section
              title="Potencia contratada"
              description="Indica la potencia contratada en cada periodo."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PERIODS.map((period) => (
                  <Field
                    key={period}
                    dataAiKey={`potencia${period}`}
                    label={`Potencia ${period}`}
                    value={form[`potencia${period}`]}
                    onChange={(value) => update(`potencia${period}`, value)}
                    suffix="kW"
                  />
                ))}
              </div>
              {tariff && (
                <div className="mt-4 rounded-xl bg-[#f4f0e5] px-4 py-3 text-sm text-[#5b5f6b]">
                  <span className="font-bold text-[#12141c]">
                    Tarifa detectada:
                  </span>{" "}
                  {tariffLabel(tariff)}
                </div>
              )}
            </Section>

            <Section
              title="Impuestos"
              description="Introduce los porcentajes que aparecen en la factura."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  dataAiKey="iva"
                  label="IVA / IGIC"
                  value={form.iva}
                  onChange={(value) => update("iva", value)}
                  suffix="%"
                />
                <Field
                  dataAiKey="ie"
                  label="Impuesto eléctrico (IE)"
                  value={form.ie}
                  onChange={(value) => update("ie", value)}
                  suffix="%"
                />
              </div>
            </Section>

            <Section
              title="Consumo"
              description="Introduce el consumo de la factura en cada periodo."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PERIODS.map((period) => (
                  <Field
                    key={period}
                    dataAiKey={`consumo${period}`}
                    label={`Consumo ${period}`}
                    value={form[`consumo${period}`]}
                    onChange={(value) => update(`consumo${period}`, value)}
                    suffix="kWh"
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Perfil de consumo"
              description="Solo se utiliza en ofertas de dos precios. Debe sumar 100%."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PERIODS.map((period) => (
                  <Field
                    key={period}
                    dataAiKey={`perfil${period}`}
                    label={`Perfil ${period}`}
                    value={form[`perfil${period}`]}
                    onChange={(value) => update(`perfil${period}`, value)}
                    suffix="%"
                  />
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm font-medium text-[#5b5f6b]">
                <input
                  type="checkbox"
                  checked={form.usarPerfil !== "false"}
                  onChange={(event) =>
                    update("usarPerfil", String(event.target.checked))
                  }
                />
                Usar perfil editable para ofertas de 2 precios
              </label>
              {!validProfile && (
                <p className="mt-3 text-sm text-red-600">
                  El perfil debe sumar 100%.
                </p>
              )}
            </Section>

            <Section
              title="Datos de la factura"
              description="Introduce los importes del periodo facturado."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  dataAiKey="diasFactura"
                  label="Días facturados"
                  value={form.diasFactura}
                  onChange={(value) => update("diasFactura", value)}
                  suffix="días"
                  step="1"
                />
                <Field
                  dataAiKey="totalFacturaActual"
                  label="Total factura actual"
                  value={form.totalFacturaActual}
                  onChange={(value) => update("totalFacturaActual", value)}
                  suffix="€"
                />
                <Field
                  dataAiKey="reactivaBonoSocial"
                  label="Reactiva / Bono Social"
                  value={form.reactivaBonoSocial}
                  onChange={(value) => update("reactivaBonoSocial", value)}
                  suffix="€"
                />
                <Field
                  dataAiKey="otrosConceptos"
                  label="Otros conceptos"
                  value={form.otrosConceptos}
                  onChange={(value) => update("otrosConceptos", value)}
                  suffix="€"
                />
                <Field
                  dataAiKey="alquilerEquipo"
                  label="Alquiler equipo"
                  value={form.alquilerEquipo}
                  onChange={(value) => update("alquilerEquipo", value)}
                  suffix="€"
                />
                <Field
                  dataAiKey="excesosPotencia"
                  label="Excesos de potencia"
                  value={form.excesosPotencia}
                  onChange={(value) => update("excesosPotencia", value)}
                  suffix="€"
                />
                <Field
                  dataAiKey="otrosDescuentos"
                  label="Otros descuentos"
                  value={form.otrosDescuentos}
                  onChange={(value) => update("otrosDescuentos", value)}
                  suffix="%"
                />
                <Field
                  dataAiKey="otrosCashbacks"
                  label="Cashback anual"
                  value={form.otrosCashbacks}
                  onChange={(value) => update("otrosCashbacks", value)}
                  suffix="€/año"
                />
              </div>
            </Section>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={!canCalculate}
              onClick={() => {
                setSubmitted(true);
                setSelectedOffer(null);
                setSelectedSnapshotOffers([]);
                window.setTimeout(
                  () =>
                    document
                      .getElementById("comparativa-results")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  50,
                );
              }}
              className="rounded-2xl bg-[#11183c] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#1b2559] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Calcular comparativa
            </button>
            {tariff && (
              <span className="text-sm text-[#777b87]">
                {tariffLabel(tariff)} · {results.length} ofertas compatibles
              </span>
            )}
          </div>

          {submitted && results.length > 0 && (
            <section id="comparativa-results" className="mt-10 scroll-mt-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-[#8a7b4f]">
                    Resultado
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Ofertas compatibles
                  </h2>
                  <p className="mt-1 text-sm text-[#777b87]">
                    Los importes se calculan con la estructura de periodos y
                    reglas del nuevo modelo Excel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSnapshot}
                  disabled={creatingSnapshot}
                  className="rounded-xl border border-[#dfe2e8] bg-white px-4 py-2.5 text-sm font-bold text-[#12141c] hover:bg-[#f7f8fa] disabled:opacity-50"
                >
                  {creatingSnapshot
                    ? "Creando imagen..."
                    : "Compartir comparativa"}
                </button>
              </div>

              {snapshotError && (
                <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {snapshotError}
                </p>
              )}

              <div className="grid gap-4">
                {results.map((result) => {
                  const selected = selectedSnapshotOffers.includes(
                    result.offerName,
                  );
                  return (
                    <article
                      key={result.offerId}
                      className={`rounded-3xl border bg-white p-5 shadow-[0_12px_35px_rgba(18,20,28,.055)] transition ${selected ? "border-[#11183c] ring-2 ring-[#11183c]/10" : "border-[#e4e6ec]"}`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f0e5] text-[#8a7b4f]">
                            <OfferIcon offerName={result.offerName} />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-[#12141c]">
                              {getDisplayOfferName(result.offerName)}
                            </h3>
                            <p className="mt-1 text-xs text-[#777b87]">
                              {result.tariff} · {result.duration}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-[#666b78]">
                              {result.discountText}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:min-w-[560px]">
                          <div>
                            <p className="text-xs text-[#858995]">Total</p>
                            <p className="mt-1 text-lg font-black">
                              {money(result.total)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#858995]">Ahorro</p>
                            <p
                              className={`mt-1 text-lg font-black ${result.saving > 0 ? "text-[#087f5b]" : "text-[#98a0ad]"}`}
                            >
                              {result.saving > 0 ? money(result.saving) : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#858995]">
                              Ahorro anual
                            </p>
                            <p
                              className={`mt-1 text-lg font-black ${result.annualSaving > 0 ? "text-[#087f5b]" : "text-[#98a0ad]"}`}
                            >
                              {result.annualSaving > 0
                                ? money(result.annualSaving)
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#858995]">Energía</p>
                            <p className="mt-1 text-lg font-black">
                              {money(result.energy)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eef0f3] pt-4">
                        <button
                          type="button"
                          onClick={() => setSelectedOffer(result)}
                          className="rounded-xl bg-[#11183c] px-4 py-2 text-xs font-bold text-white"
                        >
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSnapshotOffers((current) =>
                              current.includes(result.offerName)
                                ? current.filter(
                                    (name) => name !== result.offerName,
                                  )
                                : [...current, result.offerName],
                            )
                          }
                          className="rounded-xl border border-[#dfe2e8] px-4 py-2 text-xs font-bold text-[#12141c]"
                        >
                          {selected
                            ? "Quitar de compartir"
                            : "Añadir a compartir"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {submitted && results.length === 0 && (
            <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
              No hay ofertas compatibles con la tarifa detectada. Revisa los
              periodos de potencia y consumo y comprueba que los datos de la
              factura estén completos.
            </div>
          )}
        </div>
      </main>

      {selectedOffer && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setSelectedOffer(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[2px] text-[#8a7b4f]">
                  Detalle
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {getDisplayOfferName(selectedOffer.offerName)}
                </h2>
                <p className="mt-1 text-sm text-[#777b87]">
                  {selectedOffer.tariff}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="rounded-xl bg-[#f5f6f9] px-3 py-2 text-sm font-bold"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
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
                ["Excesos de potencia", money(selectedOffer.excessPower)],
                ["Impuesto eléctrico", money(selectedOffer.electricityTax)],
                ["Pack neto", money(selectedOffer.packNet)],
                ["IVA / IGIC", money(selectedOffer.iva)],
                ["Total", money(selectedOffer.total)],
                ["Ahorro", money(selectedOffer.saving)],
                ["Ahorro anual", money(selectedOffer.annualSaving)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[#f7f8fa] p-4">
                  <p className="text-xs text-[#858995]">{label}</p>
                  <p className="mt-1 font-extrabold">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-[#777b87]">
              {selectedOffer.discountText}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
