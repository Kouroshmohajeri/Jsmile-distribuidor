"use client";

import { useEffect, useState } from "react";

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

type UserEditModalProps = {
  user: User;
  onClose: () => void;
  onSaved: (user: User) => void;
};

export default function UserEditModal({
  user,
  onClose,
  onSaved,
}: UserEditModalProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [supervisor, setSupervisor] = useState(user.supervisor);
  const [comisionModel, setComisionModel] = useState<ComisionModel>(
    user.comisionModel,
  );
  const [role, setRole] = useState<UserRole>(user.role);
  const [active, setActive] = useState(user.active);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setSupervisor(user.supervisor);
    setComisionModel(user.comisionModel);
    setRole(user.role);
    setActive(user.active);
    setError("");
  }, [user]);

  async function handleSave() {
    setError("");

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!email.trim()) {
      setError("El email es obligatorio.");
      return;
    }

    if (!supervisor.trim()) {
      setError("El supervisor es obligatorio.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          supervisor: supervisor.trim(),
          comisionModel,
          role,
          active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron guardar los cambios.");
      }

      const updatedUser: User = {
        ...user,
        ...data,
        name: data.name ?? name.trim(),
        email: data.email ?? email.trim().toLowerCase(),
        supervisor: data.supervisor ?? supervisor.trim(),
        comisionModel: data.comisionModel ?? comisionModel,
        role: data.role ?? role,
        active: typeof data.active === "boolean" ? data.active : active,
      };

      onSaved(updatedUser);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* HEADER */}

        <div className="border-b border-[#eef0f3] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
                Usuarios
              </p>

              <h2 className="mt-1 text-xl font-black text-[#11183c]">
                Editar usuario
              </h2>

              <p className="mt-1 text-sm text-[#777b87]">
                Modifica los datos del usuario.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[#777b87] transition hover:bg-[#f4f5f8]"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {/* CONTENT */}

        <div className="overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* NAME */}

            <label>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                Nombre
              </span>

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1b2559]"
              />
            </label>

            {/* EMAIL */}

            <label>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1b2559]"
              />
            </label>

            {/* SUPERVISOR */}

            <label>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                Supervisor
              </span>

              <input
                type="text"
                value={supervisor}
                onChange={(event) => setSupervisor(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1b2559]"
              />
            </label>

            {/* ROLE */}

            <label>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
                Rol
              </span>

              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="mt-1.5 w-full rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#1b2559]"
              >
                <option value="distribuidor">Distribuidor</option>

                <option value="admin">Administrador</option>
              </select>
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
                onClick={() => setComisionModel("A")}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  comisionModel === "A"
                    ? "border-[#1b2559] bg-[#eef0f8]"
                    : "border-[#e7e9ee] bg-[#fafbfc] hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Modelo A</span>

                  <span
                    className={[
                      "h-4 w-4 rounded-full border-4",
                      comisionModel === "A"
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
                onClick={() => setComisionModel("B")}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  comisionModel === "B"
                    ? "border-[#1b2559] bg-[#eef0f8]"
                    : "border-[#e7e9ee] bg-[#fafbfc] hover:bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Modelo B</span>

                  <span
                    className={[
                      "h-4 w-4 rounded-full border-4",
                      comisionModel === "B"
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

          {/* ACTIVE */}

          <div className="mt-5 rounded-2xl border border-[#e7e9ee] bg-[#fafbfc] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#11183c]">
                  Usuario activo
                </p>

                <p className="mt-1 text-xs text-[#777b87]">
                  Permite o impide que el usuario siga utilizando su cuenta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActive((current) => !current)}
                className={[
                  "relative h-7 w-12 shrink-0 rounded-full transition",
                  active ? "bg-[#1b2559]" : "bg-[#d9dce3]",
                ].join(" ")}
                aria-label={active ? "Desactivar usuario" : "Activar usuario"}
              >
                <span
                  className={[
                    "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                    active ? "left-6" : "left-1",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>

          {/* ACCOUNT INFO */}

          <div className="mt-5 rounded-2xl bg-[#f4f5f8] p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#858995]">
              Información de cuenta
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold text-[#9a9da7]">ID</p>

                <p className="mt-1 break-all text-xs font-semibold text-[#5b5f6b]">
                  {user._id}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[#9a9da7]">Clerk ID</p>

                <p className="mt-1 break-all text-xs font-semibold text-[#5b5f6b]">
                  {user.clerkId || "—"}
                </p>
              </div>

              {user.createdAt && (
                <div>
                  <p className="text-[10px] font-bold text-[#9a9da7]">Creado</p>

                  <p className="mt-1 text-xs font-semibold text-[#5b5f6b]">
                    {new Date(user.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div className="flex gap-3 border-t border-[#eef0f3] p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-[#dfe2e8] bg-white px-4 py-3 text-sm font-extrabold text-[#5b5f6b] transition hover:bg-[#f4f5f8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-[#1b2559] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#273471] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
