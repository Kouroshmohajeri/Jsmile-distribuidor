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
    targets: { fibra: number; luz: number; gas: number };
    totalDone: number;
    totalTarget: number;
    totalPct: number;
    createdAtLabel: string;
  };
};

const categories: Category[] = ["fibra", "luz", "gas"];

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
        {(["procesando", "finalizado", "rechazado"] as Status[]).map(
          (state) => (
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
          ),
        )}
      </div>
    </div>
  );
}

function normalizeEntry(raw: Partial<Entry>): Entry {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const snapshot = raw.snapshot ?? {
    name: "",
    planLabel: "",
    targets: { fibra: 0, luz: 0, gas: 0 },
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

export default function AdminSales() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/admin/sales", { cache: "no-store" });

      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data.map(normalizeEntry) : []);
      } else {
        setEntries([]);
      }
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
    const res = await fetch(`/api/sales/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, index, state }),
    });

    if (!res.ok) return;

    const data = normalizeEntry(await res.json());

    setEntries((current) =>
      current.map((entry) => (entry._id === entryId ? data : entry)),
    );
  }

  if (loading) {
    return <p className="text-sm text-[#5b5f6b]">Cargando...</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const items = Array.isArray(entry.items) ? entry.items : [];

        return (
          <div
            key={entry._id}
            className="rounded-2xl border border-[#e6e7ec] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-extrabold">{entry.snapshot.name}</p>

                <p className="mt-1 text-xs text-[#5b5f6b]">
                  {entry.userEmail} · {entry.snapshot.planLabel}
                </p>

                <p className="mt-1 text-xs text-[#8a8f9c]">
                  {items.length}/{entry.snapshot.totalTarget} ·{" "}
                  {entry.snapshot.createdAtLabel}
                </p>
              </div>

              <StatusPill status={entry.status} />
            </div>

            <div className="mt-4 space-y-3">
              {categories.map((category) => {
                const categoryItems = items
                  .filter((item) => item.category === category)
                  .sort((a, b) => a.index - b.index);

                if (categoryItems.length === 0) return null;

                return (
                  <div key={category}>
                    <p className="mb-2 text-xs font-extrabold capitalize text-[#5b5f6b]">
                      {category}
                    </p>

                    <div className="space-y-2">
                      {categoryItems.map((item) => (
                        <ItemButton
                          key={`${item.category}-${item.index}`}
                          item={item}
                          onChange={(state) =>
                            changeItemState(
                              entry._id,
                              item.category,
                              item.index,
                              state,
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
