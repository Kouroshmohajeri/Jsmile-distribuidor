import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

import { requireAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/lib/models/User";

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || name.trim();
  const lastName = parts.join(" ") || undefined;

  return { firstName, lastName };
}

export async function GET() {
  await requireAdmin();
  await dbConnect();

  const users = await User.find({})
    .select("-__v")
    .sort({ role: 1, name: 1 })
    .lean();

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  await requireAdmin();
  await dbConnect();

  const body = await request.json();

  const name = String(body.name || "").trim();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");
  const supervisor = String(body.supervisor || "").trim();
  const comisionModel = body.comisionModel === "B" ? "B" : "A";

  if (!name || !email || !password || !supervisor) {
    return NextResponse.json(
      {
        error: "Nombre, email, contraseña y supervisor son obligatorios.",
      },
      { status: 400 },
    );
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Email no válido." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  const existing = await User.findOne({ email });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email." },
      { status: 409 },
    );
  }

  const client = await clerkClient();
  const { firstName, lastName } = splitName(name);

  let clerkUser;

  try {
    clerkUser = await client.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      ...(lastName ? { lastName } : {}),
      publicMetadata: {
        role: "distribuidor",
      },
    });
  } catch (error) {
    console.error("Clerk user creation error", error);

    return NextResponse.json(
      {
        error:
          "No se pudo crear el usuario en Clerk. Comprueba el email y la contraseña.",
      },
      { status: 502 },
    );
  }

  try {
    const user = await User.create({
      clerkId: clerkUser.id,
      email,
      name,
      comisionModel,
      supervisor,
      role: "distribuidor",
      active: true,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    try {
      await client.users.deleteUser(clerkUser.id);
    } catch (cleanupError) {
      console.error(
        "Could not roll back Clerk user after MongoDB failure",
        cleanupError,
      );
    }

    console.error("MongoDB user creation error", error);

    return NextResponse.json(
      { error: "No se pudo guardar el usuario en la base de datos." },
      { status: 500 },
    );
  }
}
