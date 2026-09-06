import mongoose, { Schema, models, model } from "mongoose";

export type UserRole = "distribuidor" | "admin";
export type ComisionModel = "A" | "B";

export interface IUser {
  clerkId?: string;
  email: string;
  name: string;
  comisionModel: ComisionModel;
  supervisor: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, index: true, sparse: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    comisionModel: {
      type: String,
      enum: ["A", "B"],
      required: true,
    },
    supervisor: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["distribuidor", "admin"],
      default: "distribuidor",
      required: true,
    },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export default models.User || model<IUser>("User", UserSchema);
