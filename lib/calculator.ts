import type { ComparadorOffer, Tariff } from "./offers";

export type ComparadorInput = {
  tariff: Tariff;

  /** P1..P6 contracted power. For 2.0TD only P1/P2 are used. */
  potencia: [number, number, number, number, number, number];

  /** P1..P6 consumption from the customer's invoice. */
  consumo: [number, number, number, number, number, number];

  /** Editable consumption profile. Used only when an offer has exactly 2 prices. */
  perfil: [number, number, number, number, number, number];

  /** Excel Datos!B41: whether the consumption profile is enabled. */
  usarPerfil: boolean;

  iva: number;
  ie: number;
  diasFactura: number;

  /** Concepts included in the electricity-tax base. */
  reactivaBonoSocial: number;

  /** Concepts subject only to IVA/IGIC. */
  otrosConceptos: number;

  alquilerEquipo: number;

  /** Datos!E35 when there is no maximeter. */
  excesosPotencia: number;

  /** Optional maximeter readings. If supplied, Excel's excess-power formula is used. */
  maximetro?: [number, number, number, number, number, number];

  /** Datos!K47: additional energy discount, expressed as a decimal. */
  otrosDescuentos: number;

  /** Datos!K48: annual cashback amount, prorated to the billing period. */
  otrosCashbacks: number;

  totalFacturaActual: number;
};

export type OfferResult = {
  offerId: string;
  offerName: string;
  tariff: string;

  energyBeforeDiscount: number;
  energyDiscount: number;
  energyDiscountP1P3: number;
  energyDiscountP4P6: number;
  energyDiscountOffer: number;
  energyDiscountPack: number;
  energyDiscountPyS: number;
  fixedEnergyDiscount: number;
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

/** Values from the workbook's Calculo PyS sheet. */
export const PACK_IBERDROLA_HOGAR = {
  name: "Pack Iberdrola Hogar",
  monthlyPrice: 8.95,
  serviceDiscount: 0.5,
  energyDiscount: 0.05,
  powerDiscount: 0,
} as const;

const EXCESS_POWER_COEFFICIENT: Record<Tariff, number> = {
  "2.0TD_2": 3.01307,
  "2.0TD_3": 3.01307,
  "3.0TD": 3.39581,
  "6.1TD": 3.566788,
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Excel TRUNC(value, 2), not ROUND(value, 2). */
function trunc2(value: number) {
  return Math.trunc((value + Number.EPSILON) * 100) / 100;
}

function isNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function getApplicablePriceCount(offer: ComparadorOffer) {
  return offer.energyPrices.filter(isNumber).length;
}

/**
 * Mirrors Calculo!W:AB:
 * - 1 price: all invoice consumption uses the single price.
 * - 2 prices: total consumption is split using the customer's profile.
 * - 3 prices: P1/P2/P3 invoice readings are used directly.
 * - 6 prices: P1..P6 invoice readings are used directly.
 */
function allocateConsumption(input: ComparadorInput, offer: ComparadorOffer) {
  const count = getApplicablePriceCount(offer);
  const totalConsumption = input.consumo.reduce((sum, value) => sum + value, 0);

  if (count === 1) {
    return [totalConsumption, 0, 0, 0, 0, 0];
  }

  if (count === 2) {
    const profileTotal = input.perfil[0] + input.perfil[1];
    const p1 =
      input.usarPerfil && profileTotal > 0
        ? input.perfil[0] / profileTotal
        : 0.55;
    const p2 =
      input.usarPerfil && profileTotal > 0
        ? input.perfil[1] / profileTotal
        : 0.45;

    return [totalConsumption * p1, totalConsumption * p2, 0, 0, 0, 0];
  }

  if (count === 3) {
    return [input.consumo[0], input.consumo[1], input.consumo[2], 0, 0, 0];
  }

  return [...input.consumo];
}

function calculateExcessPower(input: ComparadorInput) {
  if (!input.maximetro) {
    return input.excesosPotencia;
  }

  const excessKw = input.maximetro.reduce(
    (sum, reading, index) =>
      sum + Math.max(0, 2 * (reading - input.potencia[index])),
    0,
  );

  return (
    excessKw *
    EXCESS_POWER_COEFFICIENT[input.tariff] *
    (input.diasFactura / 365)
  );
}

function getFixedEnergyDiscountPerKwh(offer: ComparadorOffer) {
  if (offer.name === "3.0TD Empresa Plus") return 0.02;
  if (offer.name === "6.1TD Empresa Plus") return 0.01;
  return 0;
}

export function calculateOffer(
  input: ComparadorInput,
  offer: ComparadorOffer,
): OfferResult {
  const consumption = allocateConsumption(input, offer);
  const prices = offer.energyPrices;

  let energyBeforeDiscount = 0;

  for (let i = 0; i < 6; i++) {
    const price = prices[i];
    if (isNumber(price)) {
      energyBeforeDiscount += consumption[i] * price;
    }
  }

  /**
   * Comparativa!C36 = offer energy discount + Datos!K47.
   * Comparativa!C48 = selected PyS ELE discount + offer-specific PyS discount.
   * The workbook applies C48 only to P1/P2/P3; P4/P5/P6 receive only C36.
   */
  const energyDiscountOffer = offer.energyDiscount + input.otrosDescuentos;
  const energyDiscountPack = PACK_IBERDROLA_HOGAR.energyDiscount;
  const energyDiscountPyS = offer.pysEnergyDiscount;
  const energyDiscountP1P3 =
    energyDiscountOffer + energyDiscountPack + energyDiscountPyS;
  const energyDiscountP4P6 = energyDiscountOffer;

  let energy = 0;
  for (let i = 0; i < 6; i++) {
    const price = prices[i];
    if (!isNumber(price)) continue;

    const discount = i < 3 ? energyDiscountP1P3 : energyDiscountP4P6;
    energy += consumption[i] * price * (1 - discount);
  }

  const fixedEnergyDiscount = getFixedEnergyDiscountPerKwh(offer);
  if (fixedEnergyDiscount > 0) {
    energy -=
      consumption.reduce((sum, value) => sum + value, 0) * fixedEnergyDiscount;
  }

  let powerBeforeDiscount = 0;
  for (let i = 0; i < 6; i++) {
    const price = offer.powerPricesAnnual[i];
    if (isNumber(price)) {
      powerBeforeDiscount +=
        input.potencia[i] * (price / 365) * input.diasFactura;
    }
  }

  const powerDiscount = offer.powerDiscount;
  const power = powerBeforeDiscount * (1 - powerDiscount);

  const excessPower = calculateExcessPower(input);
  const cashback = -(input.otrosCashbacks * input.diasFactura) / 365;

  /**
   * Comparativa!V38:
   * TRUNC(energy + power + excess + reactiva + cashback, 2) * IE
   */
  const electricityTaxBase = trunc2(
    energy + power + excessPower + input.reactivaBonoSocial + cashback,
  );
  const electricityTax = electricityTaxBase * input.ie;

  const packPrice = PACK_IBERDROLA_HOGAR.monthlyPrice;
  const packDiscount = PACK_IBERDROLA_HOGAR.serviceDiscount;
  const packNet = packPrice * (1 - packDiscount);

  /** Comparativa!V46. */
  const servicesAndOther =
    input.otrosConceptos + packNet + input.alquilerEquipo;

  /** Comparativa!U48 is TRUNC(W46 + V39, 2). */
  const totalEnergyAndTax =
    energy +
    power +
    excessPower +
    input.reactivaBonoSocial +
    cashback +
    electricityTax;
  const ivaBase = trunc2(servicesAndOther + totalEnergyAndTax);
  const iva = ivaBase * input.iva;

  const total = ivaBase + iva;
  const saving = input.totalFacturaActual - total;
  const annualSaving =
    input.diasFactura > 0 ? (saving / input.diasFactura) * 365 : 0;

  const packText = `Pack Iberdrola Hogar: 5% s/Te + 50% PyS (${round2(
    packNet,
  ).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} € de PyS/factura`;

  return {
    offerId: offer.id,
    offerName: offer.name,
    tariff: offer.tariff,
    energyBeforeDiscount: round2(energyBeforeDiscount),
    energyDiscount: round2(energyDiscountP1P3),
    energyDiscountP1P3: round2(energyDiscountP1P3),
    energyDiscountP4P6: round2(energyDiscountP4P6),
    energyDiscountOffer: offer.energyDiscount,
    energyDiscountPack,
    energyDiscountPyS,
    fixedEnergyDiscount,
    energy: round2(energy),
    powerBeforeDiscount: round2(powerBeforeDiscount),
    powerDiscount,
    power: round2(power),
    reactivaBonoSocial: round2(input.reactivaBonoSocial),
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
