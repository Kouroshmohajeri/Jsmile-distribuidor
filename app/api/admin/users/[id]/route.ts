import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  await dbConnect();

  const { id } = await context.params;
  const user = await User.findById(id);

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (user._id.toString() === admin._id.toString()) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario administrador." }, { status: 400 });
  }

  if (user.role === "admin") {
    return NextResponse.json({ error: "No puedes eliminar otro administrador desde este panel." }, { status: 403 });
  }

  if (user.clerkId) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(user.clerkId);
    } catch (error) {
      console.error("Clerk delete user error", error);
      return NextResponse.json(
        { error: "No se pudo eliminar la cuenta de acceso del usuario." },
        { status: 502 },
      );
    }
  }

  await user.deleteOne();
  return NextResponse.json({ ok: true });
}
