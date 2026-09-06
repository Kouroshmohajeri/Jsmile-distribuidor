import { Schema, models, model } from "mongoose";

export type SaleStatus = "procesando" | "finalizado" | "rechazado";
export type SalePlan = "plan1" | "plan2" | "plan3" | "custom";
export type SaleCategory = "fibra" | "luz" | "gas";

export interface ISaleItem {
  category: SaleCategory;
  index: number;
  state: SaleStatus;
}

export interface ISaleCounts {
  fibra: number;
  luz: number;
  gas: number;
}

export interface ISaleTargets {
  fibra: number;
  luz: number;
  gas: number;
}

export interface ISaleSnapshot {
  name: string;
  monthKey: string;
  planId: SalePlan;
  planLabel: string;
  targets: ISaleTargets;
  counts: ISaleCounts;
  totalDone: number;
  totalTarget: number;
  totalPct: number;
  createdAtLabel: string;
  comisionModel: "A" | "B";
}

export interface ISalesEntry {
  userId: string;
  userEmail: string;
  monthKey: string;
  planId: SalePlan;
  customTargets?: ISaleTargets;
  items: ISaleItem[];
  counts: ISaleCounts;
  status: SaleStatus;
  snapshot: ISaleSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    category: { type: String, enum: ["fibra", "luz", "gas"], required: true },
    index: { type: Number, required: true, min: 1 },
    state: {
      type: String,
      enum: ["procesando", "finalizado", "rechazado"],
      default: "procesando",
      required: true,
    },
  },
  { _id: false },
);

const CountsSchema = new Schema<ISaleCounts>(
  {
    fibra: { type: Number, required: true, min: 0 },
    luz: { type: Number, required: true, min: 0 },
    gas: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const TargetsSchema = new Schema<ISaleTargets>(
  {
    fibra: { type: Number, required: true, min: 1 },
    luz: { type: Number, required: true, min: 1 },
    gas: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const SalesEntrySchema = new Schema<ISalesEntry>(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    monthKey: { type: String, required: true, index: true },
    planId: {
      type: String,
      enum: ["plan1", "plan2", "plan3", "custom"],
      required: true,
    },
    customTargets: { type: TargetsSchema },
    items: { type: [SaleItemSchema], required: true, default: [] },
    counts: { type: CountsSchema, required: true },
    status: {
      type: String,
      enum: ["procesando", "finalizado", "rechazado"],
      default: "procesando",
      required: true,
      index: true,
    },
    snapshot: {
      name: { type: String, required: true },
      monthKey: { type: String, required: true },
      planId: {
        type: String,
        enum: ["plan1", "plan2", "plan3", "custom"],
        required: true,
      },
      planLabel: { type: String, required: true },
      targets: { type: TargetsSchema, required: true },
      counts: { type: CountsSchema, required: true },
      totalDone: { type: Number, required: true },
      totalTarget: { type: Number, required: true },
      totalPct: { type: Number, required: true },
      createdAtLabel: { type: String, required: true },
      comisionModel: { type: String, enum: ["A", "B"], required: true },
    },
  },
  { timestamps: true },
);

SalesEntrySchema.index({ userId: 1, monthKey: 1, createdAt: -1 });

export default models.SalesEntry || model<ISalesEntry>("SalesEntry", SalesEntrySchema);
