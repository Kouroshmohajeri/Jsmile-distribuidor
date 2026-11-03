import type { ComparadorOffer, Tariff } from "./offers";

/**
 * Mirrors the "Comparativa" sheet of the Iberdrola comparator workbook
 * (20261103_Comparador_-_Ofertas_Iberdrola.xlsx) with "Pack Iberdrola
 * Hogar" selected as Producto y Servicio. Cell references in the comments
 * point at that sheet unless another sheet is named.
 */

export type ComparadorInput = {
  tariff: Tariff;

  /** P1..P6 contracted power (Datos!E32:J32). */
  potencia: [number, number, number, number, number, number];

  /** P1..P6 consumption from the customer's invoice (Datos!E40:J40). */
  consumo: [number, number, number, number, number, number];

  /** Consumption profile for 2-price offers (Datos!E41:J41). */
  perfil: [number, number, number, number, number, number];

  /** Datos!B41: whether the consumption profile is enabled. */
  usarPerfil: boolean;

  iva: number;
  ie: number;
  diasFactura: number;

  /** Datos!E44: concepts in the electricity-tax base. */
  reactivaBonoSocial: number;

  /** Datos!E45: concepts subject only to IVA/IGIC. */
  otrosConceptos: number;

  /** Datos!E46. */
  alquilerEquipo: number;

  /** Datos!E35, used when there is no maximeter. */
  excesosPotencia: number;

  /** Datos!E33:J33. When supplied, the workbook's excess formula is used. */
  maximetro?: [number, number, number, number, number, number];

  /** Datos!K47: extra energy discount, as a decimal. */
  otrosDescuentos: number;

  /** Datos!K48: annual cashback, prorated to the billing period. */
  otrosCashbacks: number;

  /** Datos!E48. */
  totalFacturaActual: number;
};

export type OfferResult = {
  offerId: string;
  offerName: string;
  tariff: string;

  /** kWh billed in each period (T13:T18). */
  consumption: number[];

  energyBeforeDiscount: number;
  /** Discount on energy as a rate (T20); 0 for fixed €/kWh offers. */
  energyDiscount: number;
  /** € taken off the energy term (W20, as a positive number). */
  energyDiscountAmount: number;
  energy: number;

  powerBeforeDiscount: number;
  powerDiscount: number;
  power: number;

  reactivaBonoSocial: number;
  excessPower: number;
  cashback: number;
  electricityTax: number;

  otherConcepts: number;
  packPrice: number;
  packDiscount: number;
  packNet: number;
  meterRental: number;

  iva: number;
  total: number;
  saving: number;
  annualSaving: number;

  duration: string;
  discountText: string;
};

/** 'Calculo PyS'!B8:F8. */
export const PACK_IBERDROLA_HOGAR = {
  name: "Pack Iberdrola Hogar",
  monthlyPrice: 8.95,
  serviceDiscount: 0.5,
  energyDiscount: 0.05,
} as const;

/** Calculo!S5:T8. */
const EXCESS_POWER_COEFFICIENT: Record<Tariff, number> = {
  "2.0TD_2": 3.01307,
  "2.0TD_3": 3.01307,
  "3.0TD": 3.39581,
  "6.1TD": 3.566788,
};

/** Datos!E42:F42, used for 2-price offers when the profile is off. */
const DEFAULT_PROFILE = [0.55, 0.45];

/** Calculo!W68: kWh per day in each Ahorro Eficiente tranche. */
const TRAMO_KWH_PER_DAY = 3.34;

/** Rounds to cents the way Excel displays them (4.475 → 4.48). */
function round2(value: number) {
  return Math.round(Number((value * 100).toFixed(6))) / 100;
}

/**
 * Excel TRUNC(value, 2). The value is first rounded to 9 decimals, as
 * Excel works to 15 significant digits, so 60.91 stored as 60.909999…
 * still truncates to 60.91.
 */
function trunc2(value: number) {
  return Math.trunc(Number((value * 100).toFixed(6))) / 100;
}

function isNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

const money = (value: number) =>
  value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Calculo!W:AB, the kWh billed in each period for this offer. */
function allocateConsumption(input: ComparadorInput, offer: ComparadorOffer) {
  const count = offer.energyPrices.filter(isNumber).length;
  // The workbook only adds P1..P3 (SUM(Datos!E40:G40)) for 1 and 2 prices.
  const total = input.consumo[0] + input.consumo[1] + input.consumo[2];

  if (offer.consumptionSplit === "tramos") {
    const tramo = input.diasFactura * TRAMO_KWH_PER_DAY;
    const p1 = tramo > total ? total : tramo;
    const p3 = total > tramo * 2 ? total - tramo * 2 : 0;
    return [p1, total - p1 - p3, p3, 0, 0, 0];
  }

  return input.consumo.map((reading, index) => {
    if (index + 1 > count) return 0;
    if (count === 1) return total;
    if (count === 2) {
      const share = input.usarPerfil
        ? input.perfil[index]
        : DEFAULT_PROFILE[index];
      return share * total;
    }
    return reading;
  });
}

/** V35. */
function calculateExcessPower(input: ComparadorInput) {
  if (!input.maximetro) return input.excesosPotencia;
  const excessKw = input.maximetro.reduce(
    (sum, reading, index) =>
      sum +
      (reading > input.potencia[index]
        ? 2 * (reading - input.potencia[index])
        : 0),
    0,
  );
  return excessKw * EXCESS_POWER_COEFFICIENT[input.tariff];
}

export function calculateOffer(
  input: ComparadorInput,
  offer: ComparadorOffer,
): OfferResult {
  const days = input.diasFactura;
  const consumption = allocateConsumption(input, offer);

  /* Energy: V13:V18, then the discount in W20. */
  let energyBeforeDiscount = 0;
  offer.energyPrices.forEach((price, index) => {
    if (isNumber(price)) energyBeforeDiscount += consumption[index] * price;
  });

  const totalKwh = consumption.reduce((sum, value) => sum + value, 0);
  const packEnergy = offer.packEnergyEligible
    ? PACK_IBERDROLA_HOGAR.energyDiscount
    : 0;
  // T20 = C36 + C48: offer discount + Datos!K47 + pack + offer extra.
  const energyDiscount =
    offer.fixedEnergyDiscountPerKwh > 0
      ? 0
      : offer.energyDiscount +
        input.otrosDescuentos +
        packEnergy +
        offer.pysEnergyDiscount;
  const energyDiscountAmount =
    offer.fixedEnergyDiscountPerKwh > 0
      ? offer.fixedEnergyDiscountPerKwh * totalKwh
      : energyBeforeDiscount * energyDiscount;
  const energy = energyBeforeDiscount - energyDiscountAmount; // V21

  /* Power: W24:W29, then the discount in W31. */
  let powerBeforeDiscount = 0;
  let dailyPrices = 0;
  offer.powerPricesAnnual.forEach((price, index) => {
    if (isNumber(price)) {
      powerBeforeDiscount += input.potencia[index] * days * (price / 365);
      dailyPrices += price / 365;
    }
  });
  const powerDiscount = offer.powerDiscount;
  // W31 = -SUM(V24:W29) × T31: the workbook's range also takes in the
  // €/kW·día prices in column V, so its discount is slightly larger.
  const power =
    powerBeforeDiscount - (powerBeforeDiscount + dailyPrices) * powerDiscount; // V32

  const cashback =
    -(offer.annualCashback + input.otrosCashbacks) * (days / 365); // V34
  const excessPower = calculateExcessPower(input); // V35
  const reactiva = input.reactivaBonoSocial; // V36

  /* Electricity tax: V38 = IE × TRUNC(V21 + V32 + V35 + V36 + V34, 2). */
  const electricityTax =
    input.ie * trunc2(energy + power + excessPower + reactiva + cashback);

  const totalEnergy =
    energy + power + reactiva + electricityTax + excessPower + cashback; // V39

  /* Services and other concepts: V43, W44, W46. */
  const packPrice = PACK_IBERDROLA_HOGAR.monthlyPrice;
  const packDiscount = offer.packServiceEligible
    ? PACK_IBERDROLA_HOGAR.serviceDiscount
    : 0;
  const packNet = packPrice * (1 - packDiscount);
  const services = input.otrosConceptos + packNet + input.alquilerEquipo;

  /* IVA and total: U48 = TRUNC(W46 + V39, 2), V48, V49. */
  const ivaBase = trunc2(services + totalEnergy);
  const iva = ivaBase * input.iva;
  const total = ivaBase + iva;

  const saving = input.totalFacturaActual - total; // L34
  const annualSaving = days > 0 ? (saving / days) * 365 : 0; // P38

  const packParts = [
    packEnergy ? "5% s/Te" : "",
    packDiscount ? "50% PyS" : "",
  ].filter(Boolean);
  const packText = `Pack Iberdrola Hogar${
    packParts.length ? `: ${packParts.join(" + ")}` : ""
  } (${money(round2(packNet))} € de PyS/factura)`;

  return {
    offerId: offer.id,
    offerName: offer.name,
    tariff: offer.tariff,
    consumption,
    energyBeforeDiscount: round2(energyBeforeDiscount),
    energyDiscount,
    energyDiscountAmount: round2(energyDiscountAmount),
    energy: round2(energy),
    powerBeforeDiscount: round2(powerBeforeDiscount),
    powerDiscount,
    power: round2(power),
    reactivaBonoSocial: round2(reactiva),
    excessPower: round2(excessPower),
    cashback: round2(cashback),
    electricityTax: round2(electricityTax),
    otherConcepts: round2(input.otrosConceptos),
    packPrice: round2(packPrice),
    packDiscount,
    packNet: round2(packNet),
    meterRental: round2(input.alquilerEquipo),
    iva: round2(iva),
    total: round2(total),
    saving: round2(saving),
    annualSaving: round2(annualSaving),
    duration: offer.duration,
    discountText: offer.discountText
      ? `${offer.discountText} · ${packText}`
      : packText,
  };
}

export function calculateAllOffers(
  input: ComparadorInput,
  offers: ComparadorOffer[],
) {
  return offers
    .filter((offer) => offer.tariff === input.tariff)
    .filter((offer) => offer.powerPricesAnnual.some(isNumber))
    .filter((offer) => offer.energyPrices.some(isNumber))
    .map((offer) => calculateOffer(input, offer));
}
