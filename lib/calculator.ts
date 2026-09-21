export type ComparadorInput = {
  potenciaP1: number;
  potenciaP2: number;
  consumoP1: number;
  consumoP2: number;
  consumoP3: number;
  perfilP1: number;
  perfilP2: number;
  perfilP3: number;
  iva: number;
  ie: number;
  diasFactura: number;
  reactivaBonoSocial: number;
  otrosConceptos: number;
  alquilerEquipo: number;
  totalFacturaActual: number;
};

export type ComparadorOffer = {
  id: string;
  name: string;
  tariff: "2.0TD_2" | "2.0TD_3";
  powerPricesAnnual: [number, number];
  energyPrices: [number | null, number | null, number | null];
  energyDiscount: number;
  powerDiscount: number;
  discountText: string;
  duration: string;
};

export type OfferResult = {
  offerId: string;
  offerName: string;
  tariff: string;

  energyBeforeDiscount: number;
  energyDiscount: number;
  energyDiscountOffer: number;
  energyDiscountPack: number;
  energy: number;

  powerBeforeDiscount: number;
  powerDiscount: number;
  power: number;

  reactivaBonoSocial: number;
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

/**
 * Pack Iberdrola Hogar is always included in the comparison.
 *
 * Values come from the workbook's "Calculo PyS" sheet:
 * - 8.95 €/month base price
 * - 50% PyS discount
 * - 5% additional energy discount
 *
 * Important: the workbook's 50% promotion text is not used in the
 * calculation itself. The calculation column applies the 5% ELE discount.
 */
export const PACK_IBERDROLA_HOGAR = {
  name: "Pack Iberdrola Hogar",
  monthlyPrice: 8.95,
  serviceDiscount: 0.5,
  energyDiscount: 0.05,
  powerDiscount: 0,
} as const;

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateOffer(
  input: ComparadorInput,
  offer: ComparadorOffer,
): OfferResult {
  /**
   * Total consumption from the customer's bill.
   */
  const totalConsumption = input.consumoP1 + input.consumoP2 + input.consumoP3;

  /**
   * Make sure the profile is normalized.
   *
   * The UI validates 100%, but doing this here makes the calculator
   * safe if it is called elsewhere.
   */
  const profileTotal = input.perfilP1 + input.perfilP2 + input.perfilP3;

  const profile =
    profileTotal > 0
      ? {
          p1: input.perfilP1 / profileTotal,
          p2: input.perfilP2 / profileTotal,
          p3: input.perfilP3 / profileTotal,
        }
      : {
          p1: 0,
          p2: 0,
          p3: 0,
        };

  /**
   * Available energy prices for the offer.
   */
  const prices = offer.energyPrices.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  let energyBeforeDiscount = 0;

  /**
   * ONE PRICE
   *
   * All consumption uses the single available price.
   */
  if (prices.length === 1) {
    energyBeforeDiscount = totalConsumption * prices[0];
  } else if (prices.length === 2) {
    /**
     * TWO PRICES
     *
     * The user's editable profile determines how the total
     * consumption is distributed between P1 and P2.
     */
    const consumptionP1 = totalConsumption * profile.p1;
    const consumptionP2 = totalConsumption * profile.p2;

    energyBeforeDiscount =
      consumptionP1 * prices[0] + consumptionP2 * prices[1];
  } else {
    /**
     * THREE PRICES
     *
     * The editable profile determines how much of the total
     * consumption is assigned to P1/P2/P3.
     */
    const consumptionP1 = totalConsumption * profile.p1;
    const consumptionP2 = totalConsumption * profile.p2;
    const consumptionP3 = totalConsumption * profile.p3;

    energyBeforeDiscount =
      consumptionP1 * (prices[0] ?? 0) +
      consumptionP2 * (prices[1] ?? 0) +
      consumptionP3 * (prices[2] ?? 0);
  }

  /**
   * Energy discount.
   *
   * The workbook applies the offer discount PLUS the Pack Iberdrola
   * Hogar 5% energy discount to the applicable energy price.
   */
  const energyDiscountOffer = offer.energyDiscount;
  const energyDiscountPack = PACK_IBERDROLA_HOGAR.energyDiscount;
  const energyDiscount = energyDiscountOffer + energyDiscountPack;

  const energy = energyBeforeDiscount * (1 - energyDiscount);

  /**
   * Power.
   *
   * The workbook prices are annual €/kW values, therefore convert
   * them to a daily value and multiply by the number of billing days.
   *
   * The Pack does NOT add its 5% ELE discount to power in the
   * workbook's calculation. Only the offer's power discount is used.
   */
  const powerBeforeDiscount =
    input.potenciaP1 * (offer.powerPricesAnnual[0] / 365) * input.diasFactura +
    input.potenciaP2 * (offer.powerPricesAnnual[1] / 365) * input.diasFactura;

  const powerDiscount = offer.powerDiscount;
  const power = powerBeforeDiscount * (1 - powerDiscount);

  /**
   * Electricity tax.
   *
   * Pack Iberdrola Hogar is a PyS item and is therefore not included
   * in the electricity-tax base.
   */
  const electricityTaxBase = energy + power + input.reactivaBonoSocial;

  const electricityTax = electricityTaxBase * input.ie;

  /**
   * Pack Iberdrola Hogar.
   *
   * The workbook uses the 8.95 €/month price and applies the 50% PyS
   * discount in the calculation, giving 4.475 € before rounding.
   * It is not prorated by billing days in the workbook.
   */
  const packPrice = PACK_IBERDROLA_HOGAR.monthlyPrice;
  const packDiscount = PACK_IBERDROLA_HOGAR.serviceDiscount;
  const packNet = packPrice * (1 - packDiscount);

  /**
   * IVA / IGIC base.
   *
   * PyS is included here, together with the other non-electricity-tax
   * concepts, but it is not included in the electricity-tax base above.
   */
  const subtotalBeforeIva =
    energy +
    power +
    input.reactivaBonoSocial +
    electricityTax +
    input.otrosConceptos +
    packNet +
    input.alquilerEquipo;

  const iva = subtotalBeforeIva * input.iva;

  /**
   * Final estimated bill.
   */
  const total = subtotalBeforeIva + iva;

  /**
   * Saving against customer's current bill.
   */
  const saving = input.totalFacturaActual - total;

  /**
   * Annualized saving based on the billing period.
   */
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
    energyDiscount: round2(energyDiscount),
    energyDiscountOffer: offer.energyDiscount,
    energyDiscountPack: PACK_IBERDROLA_HOGAR.energyDiscount,
    energy: round2(energy),

    powerBeforeDiscount: round2(powerBeforeDiscount),
    powerDiscount: offer.powerDiscount,
    power: round2(power),

    reactivaBonoSocial: round2(input.reactivaBonoSocial),
    electricityTax: round2(electricityTax),
    otherConcepts: round2(input.otrosConceptos),

    packPrice: round2(packPrice),
    packDiscount: packDiscount,
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
  return offers.map((offer) => calculateOffer(input, offer));
}
