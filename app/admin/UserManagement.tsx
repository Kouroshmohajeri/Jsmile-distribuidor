"use client";

import { useEffect, useState } from "react";

type User = {
  _id: string;
  name: string;
  email: string;
  supervisor: string;
  comisionModel: "A" | "B";
  role: "distribuidor" | "admin";
  active: boolean;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    supervisor: "",
    comisionModel: "A" as "A" | "B",
  });

  async function load() {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los usuarios.");
      }

      setUsers(data);
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
    load();
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el usuario.");
      }

      setUsers((current) =>
        [...current, data].sort((a, b) => a.name.localeCompare(b.name)),
      );

      setForm({
        name: "",
        email: "",
        password: "",
        supervisor: "",
        comisionModel: "A",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el usuario.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(user: User) {
    if (!window.confirm(`¿Eliminar a ${user.name}?`)) return;

    setError("");

    const response = await fetch(`/api/admin/users/${user._id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "No se pudo eliminar el usuario.");
      return;
    }

    setUsers((current) => current.filter((item) => item._id !== user._id));
  }

  return (
    <section className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-sm sm:p-7">
      <div className="border-b border-[#eef0f3] pb-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[2px] text-[#8a7b4f]">
          Administración
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Usuarios</h2>
        <p className="mt-1 text-sm text-[#777b87]">
          Registra distribuidores y gestiona sus accesos.
        </p>
      </div>

      <form onSubmit={createUser} className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Nombre completo"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl border border-[#e1e3e9] px-3 py-2.5 text-sm outline-none focus:border-[#1b2559]"
        />

        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-xl border border-[#e1e3e9] px-3 py-2.5 text-sm outline-none focus:border-[#1b2559]"
        />

        <input
          required
          type="password"
          minLength={8}
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-xl border border-[#e1e3e9] px-3 py-2.5 text-sm outline-none focus:border-[#1b2559]"
        />

        <input
          required
          placeholder="Supervisor"
          value={form.supervisor}
          onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
          className="rounded-xl border border-[#e1e3e9] px-3 py-2.5 text-sm outline-none focus:border-[#1b2559]"
        />

        <select
          value={form.comisionModel}
          onChange={(e) =>
            setForm({
              ...form,
              comisionModel: e.target.value as "A" | "B",
            })
          }
          className="rounded-xl border border-[#e1e3e9] px-3 py-2.5 text-sm font-bold outline-none focus:border-[#1b2559] sm:col-span-2"
        >
          <option value="A">Modelo A</option>
          <option value="B">Modelo B</option>
        </select>

        <button
          disabled={saving}
          type="submit"
          className="rounded-xl bg-[#1b2559] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#273471] disabled:opacity-50 sm:col-span-2"
        >
          {saving ? "Creando..." : "Registrar distribuidor"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-[#858995]">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="rounded-xl bg-[#f7f8fa] p-4 text-sm text-[#858995]">
            No hay usuarios.
          </p>
        ) : (
          users.map((user) => (
            <div
              key={user._id}
              className="flex flex-col gap-3 rounded-2xl border border-[#edf0f4] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-black">{user.name}</p>
                <p className="mt-1 text-xs text-[#777b87]">
                  {user.email} · Supervisor: {user.supervisor}
                </p>
                <p className="mt-1 text-[10px] font-bold text-[#858995]">
                  Modelo {user.comisionModel} · {user.role}
                </p>
              </div>

              {user.role === "distribuidor" && (
                <button
                  type="button"
                  onClick={() => removeUser(user)}
                  className="rounded-xl border border-red-100 px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50"
                >
                  Eliminar usuario
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
