import "dotenv/config";

import mongoose from "mongoose";

import User from "../lib/models/User";

const MONGODB_URI = process.env.MONGODB_URI as string;
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL as string;

if (!MONGODB_URI) {
  throw new Error("Falta MONGODB_URI en .env.local");
}

if (!SEED_ADMIN_EMAIL) {
  throw new Error("Falta SEED_ADMIN_EMAIL en .env.local");
}

const users = [
  {
    email: SEED_ADMIN_EMAIL,
    name: "Admin Principal",
    comisionModel: "A" as const,
    supervisor: "N/A",
    role: "admin" as const,
    active: true,
  },

  {
    email: "adm@jsmile.es",
    name: "Jesus",
    comisionModel: "A" as const,
    supervisor: "Admin Principal",
    role: "admin" as const,
    active: true,
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);

  console.log("Conectado a MongoDB");

  for (const user of users) {
    const existing = await User.findOne({ email: user.email });

    if (existing) {
      console.log(`Ya existe: ${user.email}, actualizando datos...`);

      await User.updateOne(
        { email: user.email },
        {
          $set: user,
        },
      );
    } else {
      await User.create(user);

      console.log(
        `Creado: ${user.email} (${user.role}, modelo ${user.comisionModel})`,
      );
    }
  }

  console.log("Seed completado.");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
