"use client";

import { useEffect, useState } from "react";
import CommissionSimulator from "./CommissionSimulator";

type UserRole = "distribuidor" | "admin";

type ComisionModel = "A" | "B";

type User = {
  _id: string;
  clerkId?: string;
  email: string;
  name: string;
  supervisor: string;
  role: UserRole;
  comisionModel: ComisionModel;
  active: boolean;
  createdAt?: string;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  supervisor: string;
  comisionModel: ComisionModel;
};

const INITIAL_FORM: UserForm = {
  name: "",
  email: "",
  password: "",
  supervisor: "",
  comisionModel: "A",
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState<UserForm>(INITIAL_FORM);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/users", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los usuarios.");
      }

      setUsers(Array.isArray(data) ? data : (data.users ?? []));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los usuarios.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateForm(key: keyof UserForm, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.supervisor.trim()
    ) {
      setError("Completa todos los campos.");
      return;
    }

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          supervisor: form.supervisor.trim(),
          comisionModel: form.comisionModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el usuario.");
      }

      setForm(INITIAL_FORM);

      setSuccess("Distribuidor creado correctamente.");

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el usuario.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: User) {
    if (user.role === "admin") {
      setError("Los administradores no se pueden eliminar desde aquí.");
      return;
    }

    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar a ${user.name}?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(user._id);

    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar el distribuidor.");
      }

      setUsers((current) => current.filter((item) => item._id !== user._id));

      setSuccess("Distribuidor eliminado correctamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el distribuidor.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* ======================================================
          CREATE USER
      ======================================================= */}

      <section className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-[0_12px_35px_rgba(18,20,28,.055)] sm:p-7">
        <div className="border-b border-[#eef0f3] pb-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
            Administración
          </p>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-[#11183c]">
            Crear distribuidor
          </h2>

          <p className="mt-1 text-sm text-[#777b87]">
            Crea una cuenta nueva y asigna su modelo de comisión.
          </p>
        </div>

        <form onSubmit={createUser} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                Nombre
              </span>

              <input
                type="text"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Nombre completo"
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1b2559]"
              />
            </label>

            <label>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                Email
              </span>

              <input
                type="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                placeholder="distribuidor@email.com"
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1b2559]"
              />
            </label>

            <label>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                Contraseña
              </span>

              <input
                type="password"
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1b2559]"
              />
            </label>

            <label>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                Supervisor
              </span>

              <input
                type="text"
                value={form.supervisor}
                onChange={(event) =>
                  updateForm("supervisor", event.target.value)
                }
                placeholder="Nombre del supervisor"
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1b2559]"
              />
            </label>
          </div>

          {/* COMMISSION MODEL */}

          <div className="mt-5">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
              Modelo de comisión
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateForm("comisionModel", "A")}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  form.comisionModel === "A"
                    ? "border-[#1b2559] bg-[#eef0f8]"
                    : "border-[#e7e9ee] bg-[#fafbfc] hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Modelo A</span>

                  <span
                    className={[
                      "h-4 w-4 rounded-full border-4",
                      form.comisionModel === "A"
                        ? "border-[#1b2559] bg-white"
                        : "border-[#d6d9e1] bg-white",
                    ].join(" ")}
                  />
                </div>

                <p className="mt-2 text-[11px] leading-5 text-[#777b87]">
                  Incluye el bonus de €500 al alcanzar 8 Fibra · 11 Luz · 4 Gas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => updateForm("comisionModel", "B")}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  form.comisionModel === "B"
                    ? "border-[#1b2559] bg-[#eef0f8]"
                    : "border-[#e7e9ee] bg-[#fafbfc] hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Modelo B</span>

                  <span
                    className={[
                      "h-4 w-4 rounded-full border-4",
                      form.comisionModel === "B"
                        ? "border-[#1b2559] bg-white"
                        : "border-[#d6d9e1] bg-white",
                    ].join(" ")}
                  />
                </div>

                <p className="mt-2 text-[11px] leading-5 text-[#777b87]">
                  Modelo con las tarifas superiores de comisión por Fibra.
                </p>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              ✓ {success}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#1b2559] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#1b2559]/15 transition hover:bg-[#273471] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear distribuidor"}
            </button>
          </div>
        </form>
      </section>

      {/* ======================================================
          COMMISSION SIMULATOR
      ======================================================= */}

      <CommissionSimulator />

      {/* ======================================================
          USERS
      ======================================================= */}

      <section className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-[0_12px_35px_rgba(18,20,28,.055)] sm:p-7">
        <div className="flex flex-col gap-3 border-b border-[#eef0f3] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
              Usuarios
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#11183c]">
              Usuarios registrados
            </h2>

            <p className="mt-1 text-sm text-[#777b87]">
              Gestiona distribuidores y consulta su modelo de comisión.
            </p>
          </div>

          <div className="rounded-xl bg-[#f4f5f8] px-4 py-2 text-right">
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#858995]">
              Total
            </p>

            <p className="text-sm font-extrabold text-[#1b2559]">
              {users.length}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm font-semibold text-[#858995]">
            Cargando usuarios...
          </div>
        ) : users.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-[#f7f8fa] p-6 text-center text-sm text-[#858995]">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {users.map((user) => (
              <div
                key={user._id}
                className="rounded-2xl border border-[#edf0f4] p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-[#11183c]">
                        {user.name}
                      </p>

                      <span className="rounded-full bg-[#eef0f8] px-2.5 py-1 text-[10px] font-black text-[#1b2559]">
                        {user.role === "admin"
                          ? "Administrador"
                          : "Distribuidor"}
                      </span>

                      <span className="rounded-full bg-[#f5f6f9] px-2.5 py-1 text-[10px] font-black text-[#777b87]">
                        Modelo {user.comisionModel}
                      </span>

                      {!user.active && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700">
                          Inactivo
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-xs text-[#777b87]">
                      {user.email}
                    </p>

                    <p className="mt-1 text-[10px] text-[#9a9da7]">
                      Supervisor: {user.supervisor || "—"}
                    </p>
                  </div>

                  {user.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => deleteUser(user)}
                      disabled={deletingId === user._id}
                      className="shrink-0 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === user._id ? "Eliminando..." : "Eliminar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
