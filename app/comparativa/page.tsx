"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { IBERDROLA_OFFERS } from "@/lib/offers";
import {
  calculateAllOffers,
  type ComparadorInput,
  type OfferResult,
} from "@/lib/calculator";

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
    <label className="block">
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

type OfferHighlight = {
  background: string;
  border: string;
  accent: string;
  iconBackground: string;
};

function getOfferHighlight(offerName: string): OfferHighlight | null {
  const name = offerName.toLowerCase().replace(/\s+/g, " ").trim();

  if (name.includes("tranquilidad plus")) {
    return {
      background: "#EAF2FB",
      border: "#BBD2EA",
      accent: "#557FA7",
      iconBackground: "#DCEAF7",
    };
  }

  if (name.includes("impulso 24horas") || name.includes("impulso 24 horas")) {
    return {
      background: "#FFF9DF",
      border: "#E9DDA5",
      accent: "#A4893B",
      iconBackground: "#F8EFC7",
    };
  }

  if (name.includes("ahorro inteligente")) {
    return {
      background: "#EAF6EC",
      border: "#B9DDBF",
      accent: "#4F8A5B",
      iconBackground: "#D8EEDC",
    };
  }

  return null;
}

function getOfferPriority(offerName: string): number {
  const name = offerName.toLowerCase().replace(/\s+/g, " ").trim();

  if (name.includes("tranquilidad plus")) {
    return 1;
  }

  if (name.includes("impulso 24horas") || name.includes("impulso 24 horas")) {
    return 2;
  }

  if (name.includes("ahorro inteligente")) {
    return 3;
  }

  return 100;
}

function OfferIcon({ offerName }: { offerName: string }) {
  const name = offerName.toLowerCase();

  if (name.includes("ahorro inteligente") && name.includes("8 horas")) {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5"
        />
      </svg>
    );
  }

  if (
    name.includes("supertranquilidad") ||
    name.includes("super tranquilidad")
  ) {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z"
        />
      </svg>
    );
  }

  if (
    name.includes("impulso 24h") ||
    name.includes("impulso 24 h") ||
    name.includes("impulso 24 horas")
  ) {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z"
      />
    </svg>
  );
}

const initial: Record<string, string> = {
  potenciaP1: "",
  potenciaP2: "",

  consumoP1: "",
  consumoP2: "",
  consumoP3: "",

  perfilP1: "50",
  perfilP2: "50",
  perfilP3: "0",

  iva: "21",
  ie: "5.113",

  diasFactura: "",

  reactivaBonoSocial: "0",
  otrosConceptos: "0",
  alquilerEquipo: "0",

  totalFacturaActual: "",
};

export default function ComparativaPage() {
  const router = useRouter();

  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);

  const [selectedOffer, setSelectedOffer] = useState<OfferResult | null>(null);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotError, setSnapshotError] = useState("");

  const update = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setSubmitted(false);
  };

  const parsed = useMemo<ComparadorInput | null>(() => {
    const n = (key: string) => Number(form[key]);

    const requiredFields = [
      "potenciaP1",
      "potenciaP2",
      "consumoP1",
      "consumoP2",
      "consumoP3",
      "perfilP1",
      "perfilP2",
      "perfilP3",
      "diasFactura",
      "totalFacturaActual",
    ];

    if (
      requiredFields.some((key) => form[key] === "" || !Number.isFinite(n(key)))
    ) {
      return null;
    }

    return {
      potenciaP1: n("potenciaP1"),
      potenciaP2: n("potenciaP2"),

      consumoP1: n("consumoP1"),
      consumoP2: n("consumoP2"),
      consumoP3: n("consumoP3"),

      perfilP1: n("perfilP1") / 100,
      perfilP2: n("perfilP2") / 100,
      perfilP3: n("perfilP3") / 100,

      iva: n("iva") / 100,
      ie: n("ie") / 100,

      diasFactura: n("diasFactura"),

      reactivaBonoSocial: n("reactivaBonoSocial"),
      otrosConceptos: n("otrosConceptos"),
      alquilerEquipo: n("alquilerEquipo"),

      totalFacturaActual: n("totalFacturaActual"),
    };
  }, [form]);

  const profileTotal =
    Number(form.perfilP1 || 0) +
    Number(form.perfilP2 || 0) +
    Number(form.perfilP3 || 0);

  const validProfile =
    Math.abs(profileTotal - 100) < 0.001 &&
    Number(form.perfilP1 || 0) >= 0 &&
    Number(form.perfilP2 || 0) >= 0 &&
    Number(form.perfilP3 || 0) >= 0;

  const tariff = useMemo(() => {
    if (!form.potenciaP1 || !form.potenciaP2) {
      return null;
    }

    const maxPower = Math.max(Number(form.potenciaP1), Number(form.potenciaP2));

    if (maxPower <= 10) {
      return "2.0TD_2";
    }

    if (maxPower <= 15) {
      return "2.0TD_3";
    }

    return "3.0TD";
  }, [form.potenciaP1, form.potenciaP2]);

  const results = useMemo(() => {
    if (!submitted || !parsed || !tariff || tariff === "3.0TD") {
      return [];
    }

    const compatibleOffers = IBERDROLA_OFFERS.filter(
      (
        offer,
      ): offer is typeof offer & {
        powerPricesAnnual: [number, number];
      } =>
        offer.tariff === tariff &&
        offer.powerPricesAnnual[0] !== null &&
        offer.powerPricesAnnual[1] !== null,
    );

    const calculated = calculateAllOffers(parsed, compatibleOffers);

    return [...calculated].sort((a, b) => {
      const priorityA = getOfferPriority(a.offerName);

      const priorityB = getOfferPriority(b.offerName);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return a.offerName.localeCompare(b.offerName, "es");
    });
  }, [submitted, parsed, tariff]);

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
    if (results.length === 0 || !parsed) {
      return;
    }

    const snapshotInput = parsed;
    const snapshotTariff = tariff ?? "2.0TD";

    setCreatingSnapshot(true);
    setSnapshotError("");

    try {
      // Compact 5-column LIST snapshot.
      // Every offer is one row. Columns:
      // # | PLAN | TARIFA | PRECIO / AÑO | AHORRO
      const canvasWidth = 1400;
      const padding = 42;
      const headerHeight = 112;
      const tableHeaderHeight = 42;
      const rowHeight = 62;
      const footerHeight = 42;
      const tableGap = 14;
      const tableRowsHeight = tableHeaderHeight + results.length * rowHeight;
      const canvasHeight =
        padding +
        headerHeight +
        tableGap +
        tableRowsHeight +
        footerHeight +
        padding;

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas context is not available");
      }

      const roundedRect = (
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
      ) => {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
      };

      const drawText = (
        value: string,
        x: number,
        y: number,
        font: string,
        fillStyle: string,
        align: CanvasTextAlign = "left",
      ) => {
        ctx.font = font;
        ctx.fillStyle = fillStyle;
        ctx.textAlign = align;
        ctx.textBaseline = "middle";
        ctx.fillText(value, x, y);
      };

      // Page background.
      ctx.fillStyle = "#f5f6f9";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Main card.
      roundedRect(
        padding,
        padding,
        canvasWidth - padding * 2,
        canvasHeight - padding * 2,
        24,
      );
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Header.
      drawText(
        "Comparativa de tarifas",
        padding + 28,
        padding + 30,
        "700 28px Arial, sans-serif",
        "#12141c",
      );

      drawText(
        "Planes Iberdrola · resumen de precios",
        padding + 28,
        padding + 62,
        "400 15px Arial, sans-serif",
        "#667085",
      );

      drawText(
        `${(
          snapshotInput.consumoP1 +
          snapshotInput.consumoP2 +
          snapshotInput.consumoP3
        ).toLocaleString("es-ES")} kWh/año`,
        canvasWidth - padding - 28,
        padding + 46,
        "700 16px Arial, sans-serif",
        "#12141c",
        "right",
      );

      const tableX = padding + 20;
      const tableY = padding + headerHeight + tableGap;
      const tableWidth = canvasWidth - padding * 2 - 40;

      // Explicit 5-column table widths.
      const colWidths = [58, 570, 190, 260, 260];
      const colX = [
        tableX,
        tableX + colWidths[0],
        tableX + colWidths[0] + colWidths[1],
        tableX + colWidths[0] + colWidths[1] + colWidths[2],
        tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      ];

      // Table header.
      roundedRect(tableX, tableY, tableWidth, tableHeaderHeight, 10);
      ctx.fillStyle = "#f3f4f7";
      ctx.fill();

      drawText(
        "#",
        colX[0] + 16,
        tableY + tableHeaderHeight / 2,
        "700 10px Arial, sans-serif",
        "#858995",
      );
      drawText(
        "PLAN",
        colX[1] + 16,
        tableY + tableHeaderHeight / 2,
        "700 10px Arial, sans-serif",
        "#858995",
      );
      drawText(
        "TARIFA",
        colX[2] + 16,
        tableY + tableHeaderHeight / 2,
        "700 10px Arial, sans-serif",
        "#858995",
      );
      drawText(
        "PRECIO / AÑO",
        colX[3] + 16,
        tableY + tableHeaderHeight / 2,
        "700 10px Arial, sans-serif",
        "#858995",
      );
      drawText(
        "AHORRO",
        colX[4] + 16,
        tableY + tableHeaderHeight / 2,
        "700 10px Arial, sans-serif",
        "#858995",
      );

      results.forEach((result, index) => {
        const y = tableY + tableHeaderHeight + index * rowHeight;
        const isTranquilidad = result.offerName
          .toLowerCase()
          .includes("tranquilidad plus");
        const isImpulso =
          result.offerName.toLowerCase().includes("impulso 24horas") ||
          result.offerName.toLowerCase().includes("impulso 24 horas");
        const isAhorro = result.offerName
          .toLowerCase()
          .includes("ahorro inteligente");

        const isHighlighted =
          (isTranquilidad || isImpulso || isAhorro) && index < 3;

        if (isHighlighted) {
          roundedRect(tableX + 4, y + 5, tableWidth - 8, rowHeight - 10, 10);

          ctx.fillStyle = isTranquilidad
            ? "#EAF2FB"
            : isImpulso
              ? "#FFF9DF"
              : "#EAF6EC";

          ctx.fill();
        }

        // Horizontal divider.
        if (index > 0) {
          ctx.fillStyle = "#eef0f3";
          ctx.fillRect(tableX, y, tableWidth, 1);
        }

        // 1. Rank
        drawText(
          String(index + 1),
          colX[0] + 16,
          y + rowHeight / 2,
          "700 13px Arial, sans-serif",
          isHighlighted ? "#12141c" : "#858995",
        );

        // 2. Plan name — always visible.
        drawText(
          result.offerName,
          colX[1] + 16,
          y + rowHeight / 2,
          "700 15px Arial, sans-serif",
          "#12141c",
        );

        // 3. Tariff.
        drawText(
          snapshotTariff,
          colX[2] + 16,
          y + rowHeight / 2,
          "400 13px Arial, sans-serif",
          "#667085",
        );

        // 4. Annual price.
        drawText(
          money(result.total),
          colX[3] + 16,
          y + rowHeight / 2,
          "700 16px Arial, sans-serif",
          "#12141c",
        );

        // 5. Saving.
        drawText(
          result.saving > 0 ? money(result.saving) : "—",
          colX[4] + 16,
          y + rowHeight / 2,
          "700 15px Arial, sans-serif",
          result.saving > 0 ? "#087f5b" : "#98a0ad",
        );
      });

      drawText(
        "Estimación orientativa · jsmile",
        tableX,
        canvasHeight - padding - 15,
        "400 11px Arial, sans-serif",
        "#98a0ad",
      );

      const dataUrl = canvas.toDataURL("image/jpeg", 0.86);

      try {
        sessionStorage.setItem("jsmile_share_snapshot", dataUrl);
      } catch {
        sessionStorage.setItem(
          "jsmile_share_snapshot",
          canvas.toDataURL("image/jpeg", 0.68),
        );
      }

      router.push("/compartir");
    } catch (error) {
      console.error("Could not create snapshot:", error);
      setSnapshotError("No se ha podido crear la imagen. Inténtalo de nuevo.");
    } finally {
      setCreatingSnapshot(false);
    }
  }

  return (
    <>
      <main className="min-h-screen bg-[#f5f6f9] px-4 py-8 text-[#12141c] sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* BACK */}
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[#5b5f6b] transition hover:bg-white hover:text-[#12141c]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver
          </button>

          {/* HEADER */}
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

          {/* FORM */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* POTENCIA */}
            <Section
              title="Potencia contratada"
              description="Indica la potencia contratada en cada periodo."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Potencia P1"
                  value={form.potenciaP1}
                  onChange={(value) => update("potenciaP1", value)}
                  suffix="kW"
                />

                <Field
                  label="Potencia P2"
                  value={form.potenciaP2}
                  onChange={(value) => update("potenciaP2", value)}
                  suffix="kW"
                />
              </div>

              {tariff && (
                <div className="mt-4 rounded-xl bg-[#f4f0e5] px-4 py-3 text-sm text-[#5b5f6b]">
                  <span className="font-bold text-[#12141c]">
                    Tarifa detectada:
                  </span>{" "}
                  {tariff === "2.0TD_2"
                    ? "2.0 TD · hasta 10 kW"
                    : tariff === "2.0TD_3"
                      ? "2.0 TD · más de 10 kW y hasta 15 kW"
                      : "3.0 TD · más de 15 kW"}
                </div>
              )}

              {tariff === "3.0TD" && (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
                  Con los campos solicitados actualmente solo podemos calcular
                  2.0 TD. Una tarifa 3.0 TD requiere los seis periodos de
                  potencia y consumo.
                </div>
              )}
            </Section>

            {/* TAXES */}
            <Section
              title="Impuestos"
              description="Introduce los porcentajes que aparecen en la factura."
            >
              <div className="grid gap-4 sm:grid-cols-2">
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
            </Section>

            {/* CONSUMPTION */}
            <Section
              title="Consumo"
              description="Introduce el consumo de la factura."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Consumo P1"
                  value={form.consumoP1}
                  onChange={(value) => update("consumoP1", value)}
                  suffix="kWh"
                />

                <Field
                  label="Consumo P2"
                  value={form.consumoP2}
                  onChange={(value) => update("consumoP2", value)}
                  suffix="kWh"
                />

                <Field
                  label="Consumo P3"
                  value={form.consumoP3}
                  onChange={(value) => update("consumoP3", value)}
                  suffix="kWh"
                />
              </div>

              {/* EDITABLE PROFILE */}
              <div className="mt-5 rounded-2xl border border-[#e4e6ec] bg-[#fafbfc] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#12141c]">
                      Perfil de consumo
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#858995]">
                      Distribuye el consumo entre los periodos. El total debe
                      ser 100%.
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#eef0f8] px-2.5 py-1 text-xs font-bold text-[#1b2559]">
                    Editable
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Field
                    label="P1"
                    value={form.perfilP1}
                    onChange={(value) => {
                      const p1 = Math.min(100, Math.max(0, Number(value) || 0));
                      setForm((current) => ({
                        ...current,
                        perfilP1: String(p1),
                        perfilP2: String(100 - p1),
                        perfilP3: "0",
                      }));
                      setSubmitted(false);
                    }}
                    suffix="%"
                    min={0}
                    step="1"
                  />

                  <Field
                    label="P2"
                    value={form.perfilP2}
                    onChange={(value) => {
                      const p2 = Math.min(100, Math.max(0, Number(value) || 0));
                      setForm((current) => ({
                        ...current,
                        perfilP1: String(100 - p2),
                        perfilP2: String(p2),
                        perfilP3: "0",
                      }));
                      setSubmitted(false);
                    }}
                    suffix="%"
                    min={0}
                    step="1"
                  />

                  <Field
                    label="P3"
                    value="0"
                    onChange={() => {
                      setForm((current) => ({
                        ...current,
                        perfilP3: "0",
                      }));
                    }}
                    suffix="%"
                    min={0}
                    step="1"
                  />
                </div>

                <div
                  className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                    validProfile
                      ? "bg-[#EAF6EC] text-[#4F8A5B]"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  <span>Total del perfil</span>

                  <span>{profileTotal}%</span>
                </div>

                {!validProfile && (
                  <p className="mt-2 text-xs text-red-600">
                    El perfil debe sumar exactamente 100%.
                  </p>
                )}
              </div>
            </Section>

            {/* INVOICE */}
            <Section
              title="Datos de la factura"
              description="Introduce los importes del periodo facturado."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Días de factura"
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
                  label="Reactiva + Bono Social"
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
                  label="Alquiler de equipo"
                  value={form.alquilerEquipo}
                  onChange={(value) => update("alquilerEquipo", value)}
                  suffix="€"
                />
              </div>
            </Section>
          </div>

          {/* CALCULATE */}
          <button
            type="button"
            disabled={!canCalculate || tariff === "3.0TD"}
            onClick={() => {
              setSubmitted(true);
              window.setTimeout(() => {
                document.getElementById("comparativa-results")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }, 50);
            }}
            className="mt-5 w-full cursor-pointer rounded-2xl bg-[#11183c] px-5 py-4 font-bold text-white shadow-sm transition hover:bg-[#1b2559] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            Calcular comparativa
          </button>

          {/* RESULTS */}
          {submitted && tariff !== "3.0TD" && results.length > 0 && (
            <section id="comparativa-results" className="mt-10 scroll-mt-6">
              <div>
                <div className="mb-6">
                  <p className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-[#8a7b4f]">
                    Resultado
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Ofertas Iberdrola
                  </h2>

                  <p className="mt-1 text-sm text-[#777b87]">
                    Pulsa sobre una oferta para ver todos sus detalles.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {results.map((result) => {
                    const highlight = getOfferHighlight(result.offerName);

                    return (
                      <button
                        key={result.offerId}
                        type="button"
                        onClick={() => setSelectedOffer(result)}
                        className="group relative flex min-h-71.25 cursor-pointer flex-col overflow-hidden rounded-3xl border p-5 text-left shadow-[0_8px_25px_rgba(18,20,28,.045)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(18,20,28,.10)] focus:outline-none focus:ring-2 focus:ring-[#1b2559]/20"
                        style={{
                          backgroundColor: highlight?.background ?? "#ffffff",
                          borderColor: highlight?.border ?? "#e4e6ec",
                        }}
                      >
                        {highlight && (
                          <div
                            className="absolute left-0 top-0 h-1 w-full"
                            style={{
                              backgroundColor: highlight.accent,
                            }}
                          />
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                              style={{
                                backgroundColor:
                                  highlight?.iconBackground ?? "#f1f2f5",
                                color: highlight?.accent ?? "#626775",
                              }}
                            >
                              <OfferIcon offerName={result.offerName} />
                            </span>

                            <div className="min-w-0">
                              <p className="line-clamp-2 text-base font-extrabold leading-5 text-[#12141c]">
                                {result.offerName}
                              </p>

                              {highlight && (
                                <p
                                  className="mt-1 text-[10px] font-extrabold uppercase tracking-[1.2px]"
                                  style={{
                                    color: highlight.accent,
                                  }}
                                >
                                  Oferta destacada
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#777b87] transition group-hover:translate-x-0.5 group-hover:text-[#12141c]">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </span>
                        </div>

                        <div className="mt-4 min-h-10.5">
                          <p className="line-clamp-2 text-xs leading-5 text-[#777b87]">
                            {result.discountText ||
                              "Oferta de electricidad Iberdrola."}
                          </p>
                        </div>

                        <div className="mt-auto pt-6">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-black/5 bg-white/65 p-3">
                              <p className="text-[9px] font-extrabold uppercase tracking-[1px] text-[#858995]">
                                Precio actual
                              </p>

                              <p className="mt-1 text-lg font-bold text-[#777b87] line-through decoration-[#b4b7bf]">
                                {money(parsed!.totalFacturaActual)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-black/5 bg-white/85 p-3">
                              <p className="text-[9px] font-extrabold uppercase tracking-[1px] text-[#858995]">
                                Con este plan
                              </p>

                              <p className="mt-1 text-lg font-black text-[#12141c]">
                                {money(result.total)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-end justify-between">
                            <div>
                              <p className="text-[9px] font-extrabold uppercase tracking-[1px] text-[#858995]">
                                Ahorro
                              </p>

                              <p
                                className="mt-0.5 text-2xl font-black"
                                style={{
                                  color: highlight?.accent ?? "#4F8A5B",
                                }}
                              >
                                {money(result.saving)}
                              </p>
                            </div>

                            <span className="pb-1 text-xs font-medium text-[#858995]">
                              / factura
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-[#e4e6ec] bg-white p-4 shadow-[0_8px_25px_rgba(18,20,28,.045)] sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-extrabold text-[#12141c]">
                      Compartir comparativa
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#777b87]">
                      Crea una imagen con todas las ofertas y precios para
                      compartirla mediante un código QR.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSnapshot}
                    disabled={creatingSnapshot}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#11183c] px-5 py-3 font-bold text-white transition hover:bg-[#1b2559] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingSnapshot ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="opacity-90"
                            d="M21 12a9 9 0 0 0-9-9"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </svg>
                        Creando snapshot...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 7h3l2-2h8l2 2h3v12H3V7z"
                          />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                        Compartir snapshot
                      </>
                    )}
                  </button>
                </div>

                {snapshotError && (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {snapshotError}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* NO RESULTS */}
          {submitted && tariff !== "3.0TD" && results.length === 0 && (
            <div className="mt-8 rounded-2xl border border-[#e4e6ec] bg-white p-8 text-center">
              <p className="font-bold text-[#12141c]">
                No se han encontrado ofertas.
              </p>

              <p className="mt-2 text-sm text-[#777b87]">
                Comprueba los datos introducidos y vuelve a calcular.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {selectedOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#12141c]/45 p-4 backdrop-blur-sm"
          onMouseDown={() => setSelectedOffer(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-modal-title"
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-[0_30px_100px_rgba(0,0,0,.22)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {(() => {
              const highlight = getOfferHighlight(selectedOffer.offerName);

              return (
                <>
                  {/* MODAL HEADER */}
                  <div
                    className="relative overflow-hidden rounded-t-3xl border-b border-black/5 px-6 py-6 sm:px-8"
                    style={{
                      backgroundColor: highlight?.background ?? "#f8f9fb",
                    }}
                  >
                    {highlight && (
                      <div
                        className="absolute left-0 top-0 h-1.5 w-full"
                        style={{
                          backgroundColor: highlight.accent,
                        }}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedOffer(null)}
                      className="absolute right-5 top-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/80 text-[#5b5f6b] transition hover:bg-white hover:text-[#12141c]"
                      aria-label="Cerrar"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 6l12 12M18 6L6 18"
                        />
                      </svg>
                    </button>

                    <div className="flex items-start gap-4 pr-10">
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                        style={{
                          backgroundColor:
                            highlight?.iconBackground ?? "#f1f2f5",
                          color: highlight?.accent ?? "#626775",
                        }}
                      >
                        <OfferIcon offerName={selectedOffer.offerName} />
                      </span>

                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
                          Oferta Iberdrola
                        </p>

                        <h2
                          id="offer-modal-title"
                          className="mt-1 text-2xl font-black tracking-tight text-[#12141c]"
                        >
                          {selectedOffer.offerName}
                        </h2>

                        {selectedOffer.duration && (
                          <p className="mt-2 text-sm text-[#777b87]">
                            Duración: {selectedOffer.duration}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MODAL CONTENT */}
                  <div className="p-6 sm:p-8">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-[#f7f7f9] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#858995]">
                          Precio actual
                        </p>

                        <p className="mt-2 text-xl font-bold text-[#777b87]">
                          {money(parsed!.totalFacturaActual)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#f7f7f9] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#858995]">
                          Nuevo precio
                        </p>

                        <p className="mt-2 text-xl font-black text-[#12141c]">
                          {money(selectedOffer.total)}
                        </p>
                      </div>

                      <div
                        className="rounded-2xl p-4"
                        style={{
                          backgroundColor:
                            highlight?.iconBackground ?? "#EAF6EC",
                        }}
                      >
                        <p className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#858995]">
                          Ahorro
                        </p>

                        <p
                          className="mt-2 text-xl font-black"
                          style={{
                            color: highlight?.accent ?? "#4F8A5B",
                          }}
                        >
                          {money(selectedOffer.saving)}
                        </p>
                      </div>
                    </div>

                    {/* DETAIL TABLE */}
                    <div className="mt-7">
                      <h3 className="text-base font-extrabold text-[#12141c]">
                        Detalle de la oferta
                      </h3>

                      <div className="mt-3 divide-y divide-[#eef0f3] rounded-2xl border border-[#e4e6ec]">
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-[#777b87]">
                            Coste de energía
                          </span>

                          <strong className="text-sm text-[#12141c]">
                            {money(selectedOffer.energy)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-[#777b87]">
                            Coste de potencia
                          </span>

                          <strong className="text-sm text-[#12141c]">
                            {money(selectedOffer.power)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-[#777b87]">
                            Reactiva + Bono Social
                          </span>

                          <strong className="text-sm text-[#12141c]">
                            {money(selectedOffer.reactivaBonoSocial)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-[#777b87]">
                            Impuesto eléctrico
                          </span>

                          <strong className="text-sm text-[#12141c]">
                            {money(selectedOffer.electricityTax)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-[#777b87]">
                            Otros conceptos
                          </span>

                          <strong className="text-sm text-[#12141c]">
                            {money(selectedOffer.otherConcepts)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-[#777b87]">
                            Pack Iberdrola Hogar
                          </span>

                          <div className="text-right">
                            <strong className="block text-sm text-[#12141c]">
                              {money(selectedOffer.packNet)}
                            </strong>
                            <span className="text-[11px] text-[#858995]">
                              {money(selectedOffer.packPrice)} −{" "}
                              {(selectedOffer.packDiscount * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-[#777b87]">
                            Alquiler de equipo
                          </span>

                          <strong className="text-sm text-[#12141c]">
                            {money(selectedOffer.meterRental)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-[#777b87]">
                            IVA / IGIC
                          </span>

                          <strong className="text-sm text-[#12141c]">
                            {money(selectedOffer.iva)}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between gap-4 bg-[#fafbfc] px-4 py-4">
                          <span className="font-bold text-[#12141c]">
                            Total estimado
                          </span>

                          <strong className="text-lg font-black text-[#12141c]">
                            {money(selectedOffer.total)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* PROFILE */}
                    <div className="mt-6 rounded-2xl border border-[#e4e6ec] bg-[#fafbfc] p-5">
                      <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#858995]">
                        Perfil utilizado
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white p-3 text-center">
                          <p className="text-xs text-[#858995]">P1</p>

                          <p className="mt-1 font-black text-[#12141c]">
                            {form.perfilP1}%
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 text-center">
                          <p className="text-xs text-[#858995]">P2</p>

                          <p className="mt-1 font-black text-[#12141c]">
                            {form.perfilP2}%
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 text-center">
                          <p className="text-xs text-[#858995]">P3</p>

                          <p className="mt-1 font-black text-[#12141c]">
                            {form.perfilP3}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CONDITIONS */}
                    <div className="mt-6 rounded-2xl bg-[#fafbfc] p-5">
                      <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#858995]">
                        Condiciones
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#5b5f6b]">
                        {selectedOffer.discountText ||
                          "No hay información adicional disponible para esta oferta."}
                      </p>

                      <p className="mt-3 text-xs leading-5 text-[#858995]">
                        Esta comparativa incluye siempre el Pack Iberdrola
                        Hogar: 5% adicional de descuento en energía y 50% de
                        descuento sobre el servicio, según la configuración de
                        la hoja Calculo PyS.
                      </p>
                    </div>

                    {/* ANNUAL SAVING */}
                    <div
                      className="mt-4 flex items-center justify-between rounded-2xl p-5"
                      style={{
                        backgroundColor: highlight?.background ?? "#EAF6EC",
                      }}
                    >
                      <div>
                        <p className="text-sm font-bold text-[#12141c]">
                          Ahorro estimado anual
                        </p>

                        <p className="mt-1 text-xs text-[#777b87]">
                          Estimación basada en los datos introducidos.
                        </p>
                      </div>

                      <p
                        className="text-2xl font-black"
                        style={{
                          color: highlight?.accent ?? "#4F8A5B",
                        }}
                      >
                        {money(selectedOffer.annualSaving)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOffer(null)}
                      className="mt-6 w-full cursor-pointer rounded-2xl bg-[#11183c] px-5 py-3.5 font-bold text-white transition hover:bg-[#1b2559]"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
