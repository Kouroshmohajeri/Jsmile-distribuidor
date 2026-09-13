"use client";

import { useEffect, useState } from "react";

type Status = "procesando" | "finalizado" | "rechazado";

type Category = "fibra" | "luz" | "gas";

type Item = {
  category: Category;
  index: number;
  state: Status;
};

type Entry = {
  _id: string;
  userEmail: string;
  monthKey: string;
  status: Status;
  items: Item[];
  snapshot: {
    name: string;
    planLabel: string;
    targets: {
      fibra: number;
      luz: number;
      gas: number;
    };
    totalDone: number;
    totalTarget: number;
    totalPct: number;
    createdAtLabel: string;
  };
};

const categories: Category[] = ["fibra", "luz", "gas"];

const statuses: Status[] = ["procesando", "finalizado", "rechazado"];

const labels: Record<Status, string> = {
  procesando: "Procesando",
  finalizado: "Finalizado",
  rechazado: "Rechazado",
};

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
        status === "procesando" && "bg-blue-50 text-blue-700",
        status === "finalizado" && "bg-green-50 text-green-700",
        status === "rechazado" && "bg-red-50 text-red-700",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {labels[status]}
    </span>
  );
}

function ItemButton({
  item,
  onChange,
}: {
  item: Item;
  onChange: (state: Status) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e6e7ec] bg-[#f4f5f8] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-extrabold capitalize">
          {item.category} #{item.index}
        </span>

        <StatusPill status={item.state} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {statuses.map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => onChange(state)}
            className={[
              "rounded-lg border px-2 py-2 text-[10px] font-extrabold transition",
              item.state === state
                ? state === "procesando"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : state === "finalizado"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-red-600 bg-red-600 text-white"
                : "border-[#e0e2e7] bg-white text-[#5b5f6b] hover:border-[#3a4a8f]",
            ].join(" ")}
          >
            {labels[state]}
          </button>
        ))}
      </div>
    </div>
  );
}

function normalizeEntry(raw: Partial<Entry>): Entry {
  const items = Array.isArray(raw.items) ? raw.items : [];

  const snapshot = raw.snapshot ?? {
    name: "",
    planLabel: "",
    targets: {
      fibra: 0,
      luz: 0,
      gas: 0,
    },
    totalDone: items.length,
    totalTarget: 0,
    totalPct: 0,
    createdAtLabel: "",
  };

  return {
    _id: raw._id ?? "",
    userEmail: raw.userEmail ?? "",
    monthKey: raw.monthKey ?? "",
    status: raw.status ?? "procesando",
    items,
    snapshot: {
      ...snapshot,
      totalDone:
        typeof snapshot.totalDone === "number"
          ? snapshot.totalDone
          : items.length,
    },
  };
}

function SalesModal({
  entry,
  onClose,
  onChange,
  savingKey,
}: {
  entry: Entry;
  onClose: () => void;
  onChange: (category: Category, index: number, state: Status) => Promise<void>;
  savingKey: string | null;
}) {
  const items = Array.isArray(entry.items) ? entry.items : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#eef0f3] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black">
                  {entry.snapshot.name || "Usuario"}
                </h3>

                <StatusPill status={entry.status} />
              </div>

              <p className="mt-1 truncate text-sm text-[#5b5f6b]">
                {entry.userEmail}
              </p>

              <p className="mt-1 text-xs text-[#8a8f9c]">
                {entry.snapshot.planLabel}
                {entry.snapshot.createdAtLabel
                  ? ` · ${entry.snapshot.createdAtLabel}`
                  : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[#777b87] hover:bg-[#f4f5f8]"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {categories.map((category) => {
              const categoryItems = items.filter(
                (item) => item.category === category,
              );

              const done = categoryItems.filter(
                (item) => item.state === "finalizado",
              ).length;

              return (
                <div key={category} className="rounded-xl bg-[#f4f5f8] p-3">
                  <p className="text-xs font-bold capitalize text-[#777b87]">
                    {category}
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {done}/{categoryItems.length}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="space-y-5">
            {categories.map((category) => {
              const categoryItems = items
                .filter((item) => item.category === category)
                .sort((a, b) => a.index - b.index);

              if (categoryItems.length === 0) {
                return null;
              }

              return (
                <div key={category}>
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#5b5f6b]">
                    {category}
                  </p>

                  <div className="space-y-2">
                    {categoryItems.map((item) => {
                      const key = `${item.category}-${item.index}`;

                      return (
                        <ItemButton
                          key={key}
                          item={item}
                          onChange={(state) =>
                            onChange(item.category, item.index, state)
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="rounded-2xl bg-[#f4f5f8] p-6 text-center text-sm text-[#777b87]">
                Este usuario no tiene ventas registradas.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#eef0f3] p-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#1b2559] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#151d49]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSales() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/sales", {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();

        setEntries(Array.isArray(data) ? data.map(normalizeEntry) : []);
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeItemState(
    entryId: string,
    category: Category,
    index: number,
    state: Status,
  ) {
    const key = `${category}-${index}`;

    setSavingKey(key);

    try {
      const res = await fetch(`/api/sales/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          index,
          state,
        }),
      });

      if (!res.ok) return;

      const data = normalizeEntry(await res.json());

      setEntries((current) =>
        current.map((entry) => (entry._id === entryId ? data : entry)),
      );

      setSelectedEntry((current) =>
        current?._id === entryId ? data : current,
      );
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#5b5f6b]">Cargando...</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {entries.map((entry) => {
          const items = Array.isArray(entry.items) ? entry.items : [];

          return (
            <button
              key={entry._id}
              type="button"
              onClick={() => setSelectedEntry(entry)}
              className="group w-full rounded-2xl border border-[#e6e7ec] bg-white p-4 text-left shadow-sm transition hover:border-[#3a4a8f] hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-extrabold">
                    {entry.snapshot.name || "Usuario"}
                  </p>

                  <p className="mt-1 truncate text-xs text-[#5b5f6b]">
                    {entry.userEmail} · {entry.snapshot.planLabel}
                  </p>

                  <p className="mt-1 text-xs text-[#8a8f9c]">
                    {items.length}/{entry.snapshot.totalTarget}
                    {entry.snapshot.createdAtLabel
                      ? ` · ${entry.snapshot.createdAtLabel}`
                      : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill status={entry.status} />

                  <span className="text-lg text-[#8a8f9c] transition group-hover:translate-x-1 group-hover:text-[#1b2559]">
                    →
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedEntry && (
        <SalesModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onChange={(category, index, state) =>
            changeItemState(selectedEntry._id, category, index, state)
          }
          savingKey={savingKey}
        />
      )}
    </>
  );
}
