export type InvoiceFields = {
  potenciaP1: string;
  potenciaP2: string;
  consumoP1: string;
  consumoP2: string;
  consumoP3: string;
  perfilP1: string;
  perfilP2: string;
  perfilP3: string;
  iva: string;
  ie: string;
  diasFactura: string;
  reactivaBonoSocial: string;
  otrosConceptos: string;
  alquilerEquipo: string;
  totalFacturaActual: string;
};

export type InvoiceValidation = {
  consumptionMatches: boolean;
  profileMatches: boolean;
  warnings: string[];
};

export type ExtractionResult = {
  fields: InvoiceFields;
  validation: InvoiceValidation;
};

export const emptyFields: InvoiceFields = {
  potenciaP1: "",
  potenciaP2: "",
  consumoP1: "",
  consumoP2: "",
  consumoP3: "",
  perfilP1: "",
  perfilP2: "",
  perfilP3: "",
  iva: "",
  ie: "",
  diasFactura: "",
  reactivaBonoSocial: "0",
  otrosConceptos: "0",
  alquilerEquipo: "0",
  totalFacturaActual: "",
};

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  let text = value
    .trim()
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/%/g, "");
  if (!text) return null;

  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function format(value: unknown, decimals = 3): string {
  const number = cleanNumber(value);
  return number === null ? "" : Number(number.toFixed(decimals)).toString();
}

function money(value: unknown): string {
  const number = cleanNumber(value);
  return number === null ? "" : Number(number.toFixed(2)).toString();
}

export function normalizeInvoiceFields(
  input: Partial<Record<keyof InvoiceFields, unknown>>,
): ExtractionResult {
  const fields: InvoiceFields = {
    potenciaP1: format(input.potenciaP1, 3),
    potenciaP2: format(input.potenciaP2, 3),
    consumoP1: format(input.consumoP1, 3),
    consumoP2: format(input.consumoP2, 3),
    consumoP3: format(input.consumoP3, 3),
    perfilP1: "20",
    perfilP2: "80",
    perfilP3: "0",
    iva: format(input.iva, 6),
    ie: format(input.ie, 6),
    diasFactura:
      input.diasFactura == null
        ? ""
        : String(Math.round(cleanNumber(input.diasFactura) ?? 0)),
    reactivaBonoSocial: money(input.reactivaBonoSocial) || "0",
    otrosConceptos: money(input.otrosConceptos) || "0",
    alquilerEquipo: money(input.alquilerEquipo) || "0",
    totalFacturaActual: money(input.totalFacturaActual),
  };

  const p1 = cleanNumber(fields.consumoP1);
  const p2 = cleanNumber(fields.consumoP2);
  const p3 = cleanNumber(fields.consumoP3);
  const warnings: string[] = [];

  if (p1 === null || p2 === null || p3 === null) {
    warnings.push(
      "No se han podido extraer los tres periodos de consumo facturado (kWh). Revisa la tabla de consumo de la factura.",
    );
  }

  // Profile is a fixed business rule, independent of invoice consumption.
  fields.perfilP1 = "20";
  fields.perfilP2 = "80";
  fields.perfilP3 = "0";
  const profileMatches = true;

  const required: Array<[keyof InvoiceFields, string]> = [
    ["potenciaP1", "potencia P1"],
    ["potenciaP2", "potencia P2"],
    ["consumoP1", "consumo P1"],
    ["consumoP2", "consumo P2"],
    ["consumoP3", "consumo P3"],
    ["iva", "IVA/IGIC"],
    ["ie", "impuesto eléctrico"],
    ["diasFactura", "días de factura"],
    ["totalFacturaActual", "total de factura"],
  ];

  for (const [key, label] of required) {
    if (!fields[key]) warnings.push(`No se ha podido extraer ${label}.`);
  }

  const days = cleanNumber(fields.diasFactura);
  if (days !== null && (days <= 0 || days > 366)) {
    warnings.push("El número de días facturados parece inválido.");
  }

  return {
    fields,
    validation: {
      consumptionMatches: p1 !== null && p2 !== null && p3 !== null,
      profileMatches,
      warnings,
    },
  };
}
