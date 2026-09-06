/**
 * Commission calculation for distributors.
 *
 * Modelo A:
 * 1-3 Fibra   => 10€ each
 * 4-10 Fibra  => 15€ each
 * 11-15 Fibra => 20€ each
 * +15 Fibra   => 25€ each
 *
 * Modelo B:
 * 1-3 Fibra   => 65€ each
 * 4-10 Fibra  => 75€ each
 * 11-15 Fibra => 90€ each
 * +15 Fibra   => 100€ each
 *
 * Luz: 60€ each by default
 * Gas: 30€ each by default
 * Alarma normal: 150€ each
 * Alarma 3D: 100€ each
 *
 * Modelo A bonus:
 * 8 Fibra + 11 Luz + 4 Gas => +500€
 */

export type ComisionModel = "A" | "B";

const FIBRA_RATES: Record<
  ComisionModel,
  { min: number; max: number; rate: number }[]
> = {
  A: [
    { min: 1, max: 3, rate: 10 },
    { min: 4, max: 10, rate: 15 },
    { min: 11, max: 14, rate: 20 },
  ],
  B: [
    { min: 1, max: 3, rate: 65 },
    { min: 4, max: 10, rate: 75 },
    { min: 11, max: 14, rate: 90 },
  ],
};

const FIBRA_RATE_OVER_15: Record<ComisionModel, number> = {
  A: 25,
  B: 100,
};

const DEFAULT_LUZ_RATE = 60;
const DEFAULT_GAS_RATE = 30;

const ALARMA_RATE_NORMAL = 150;
const ALARMA_RATE_3D = 100;

const BONUS_MODEL_A = 500;

const BONUS_TARGET = {
  fibra: 8,
  luz: 11,
  gas: 4,
};

function fibraRateForCount(model: ComisionModel, count: number): number {
  if (count <= 0) return 0;

  const bracket = FIBRA_RATES[model].find(
    (bracket) => count >= bracket.min && count <= bracket.max,
  );

  return bracket ? bracket.rate : FIBRA_RATE_OVER_15[model];
}

export interface EstimateInput {
  model: ComisionModel;
  fibra: number;
  luz: number;
  gas: number;
  alarmaNormal?: number;
  alarma3d?: number;
  luzRate?: number;
  gasRate?: number;
}

export interface EstimateBreakdown {
  fibraRate: number;
  fibraTotal: number;
  luzTotal: number;
  gasTotal: number;
  alarmaTotal: number;
  bonus: number;
  total: number;
}

export function estimateCommission(input: EstimateInput): EstimateBreakdown {
  const luzRate = input.luzRate ?? DEFAULT_LUZ_RATE;

  const gasRate = input.gasRate ?? DEFAULT_GAS_RATE;

  const fibraRate = fibraRateForCount(input.model, input.fibra);

  const fibraTotal = fibraRate * input.fibra;

  const luzTotal = input.luz * luzRate;

  const gasTotal = input.gas * gasRate;

  const alarmaTotal =
    (input.alarmaNormal ?? 0) * ALARMA_RATE_NORMAL +
    (input.alarma3d ?? 0) * ALARMA_RATE_3D;

  const bonus =
    input.model === "A" &&
    input.fibra === BONUS_TARGET.fibra &&
    input.luz === BONUS_TARGET.luz &&
    input.gas === BONUS_TARGET.gas
      ? BONUS_MODEL_A
      : 0;

  const total = fibraTotal + luzTotal + gasTotal + alarmaTotal + bonus;

  return {
    fibraRate,
    fibraTotal,
    luzTotal,
    gasTotal,
    alarmaTotal,
    bonus,
    total,
  };
}
