import { UserButton } from "@clerk/nextjs";
import { requireAdmin } from "@/lib/auth";
import AdminSales from "./AdminSales";
import UserManagement from "./UserManagement";

export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <main className="min-h-screen bg-[#f4f5f8] pb-10">
      <header className="bg-gradient-to-br from-[#1b2559] to-[#0d1230] px-5 pb-10 pt-9 text-white">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#c7ccdd]">
              jsmile.es
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
              Panel de Administración
            </h1>
            <p className="mt-2 text-sm text-[#c7ccdd]">
              Usuarios y estados individuales de ventas.
            </p>
          </div>
          <UserButton />
        </div>
      </header>

      <div className="relative mx-auto -mt-5 max-w-5xl space-y-5 px-4">
        <UserManagement />

        <section className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-sm sm:p-7">
          <div className="border-b border-[#eef0f3] pb-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
              Control de ventas
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Ventas por distribuidor
            </h2>
            <p className="mt-1 text-sm text-[#777b87]">
              Cambia el estado de cada venta individual.
            </p>
          </div>
          <div className="mt-5">
            <AdminSales />
          </div>
        </section>

        <p className="pt-2 text-center text-xs text-[#9599a4]">
          Administrador: {admin.email}
        </p>
      </div>
    </main>
  );
}
