import type { Targets } from "./types";

export const PLANS = {
  plan1: { label: "Plan 1", fibra: 8, luz: 11, gas: 4 },
  plan2: { label: "Plan 2", fibra: 11, luz: 11, gas: 4 },
  plan3: { label: "Plan 3", fibra: 15, luz: 11, gas: 4 },
} as const;

export const CUSTOM_MINIMUMS: Targets = {
  fibra: 8,
  luz: 11,
  gas: 4,
};

export const CUSTOM_DEFAULTS: Targets = {
  fibra: 9,
  luz: 12,
  gas: 5,
};
