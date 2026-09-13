export type PlanId = "plan1" | "plan2" | "plan3" | "custom";
export type Status = "procesando" | "finalizado" | "rechazado";

export type Counts = {
  fibra: number;
  luz: number;
  gas: number;
};

export type Targets = Counts;

export type SaleItem = {
  category: keyof Counts;
  index: number;
  state: Status;
};

export type Entry = {
  _id: string;
  userEmail: string;
  monthKey: string;
  planId: PlanId;
  counts: Counts;
  status: Status;
  items?: SaleItem[];
  snapshot: {
    name: string;
    planLabel: string;
    targets: Targets;
    counts: Counts;
    totalDone: number;
    totalTarget: number;
    totalPct: number;
    createdAtLabel: string;
  };
};
