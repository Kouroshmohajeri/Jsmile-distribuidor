import type { Counts, SaleItem } from "./types";

export function Counter({
  label,
  category,
  target,
  boxCount,
  items,
  savedItems,
  onToggle,
  onAddBox,
}: {
  label: string;
  category: keyof Counts;
  target: number;
  boxCount: number;
  items: SaleItem[];
  savedItems: SaleItem[];
  onToggle: (index: number) => void;
  onAddBox: () => void;
}) {
  const itemMap = new Map(items.map((item) => [item.index, item.state]));
  const savedKeys = new Set(
    savedItems.map((item) => `${item.category}:${item.index}`),
  );

  const selectedCount = items.filter(
    (item) => item.state !== "rechazado",
  ).length;

  return (
    <div className="rounded-2xl border border-[#e8e9ee] bg-[#fafbfc] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-extrabold">{label}</p>
          <p className="mt-0.5 text-[11px] text-[#858995]">
            Objetivo: {target}
          </p>
        </div>

        <div className="flex items-center gap-2 text-right">
          {selectedCount >= target && (
            <button
              type="button"
              onClick={onAddBox}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1b2559] bg-white text-lg font-black text-[#1b2559] hover:bg-[#eef0f8] active:scale-95"
              title="Añadir una venta adicional"
              aria-label={`Añadir una venta adicional de ${label}`}
            >
              +
            </button>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase text-[#9a9da7]">
              Seleccionadas
            </p>
            <p className="mt-1 text-xl font-black text-[#1b2559]">
              {selectedCount}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-9">
        {Array.from({ length: boxCount }, (_, index) => index + 1).map(
          (number) => {
            const state = itemMap.get(number);
            const saved = savedKeys.has(`${category}:${number}`);
            const selected = Boolean(state);

            return (
              <button
                key={number}
                type="button"
                disabled={saved}
                onClick={() => !saved && onToggle(number)}
                title={
                  saved
                    ? state === "procesando"
                      ? "Venta guardada y en proceso"
                      : state === "finalizado"
                        ? "Venta finalizada"
                        : "Venta rechazada"
                    : selected
                      ? "Quitar selección antes de guardar"
                      : "Seleccionar venta"
                }
                className={[
                  "flex aspect-square items-center justify-center rounded-xl border text-sm font-black transition-all",
                  saved &&
                    state === "procesando" &&
                    "cursor-not-allowed border-blue-600 bg-blue-600 text-white shadow-sm",
                  saved &&
                    state === "finalizado" &&
                    "cursor-not-allowed border-emerald-600 bg-emerald-600 text-white shadow-sm",
                  saved &&
                    state === "rechazado" &&
                    "cursor-not-allowed border-red-600 bg-red-600 text-white shadow-sm",
                  !saved &&
                    selected &&
                    "border-[#1b2559] bg-[#1b2559] text-white shadow-sm active:scale-95",
                  !saved &&
                    !selected &&
                    "border-[#e2e4e9] bg-white text-[#1b2559] hover:bg-[#eef0f8] active:scale-95",
                ].join(" ")}
              >
                {state === "rechazado" ? "✕" : selected ? "✓" : number}
              </button>
            );
          },
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] font-bold text-[#858995]">
          {savedItems.length > 0
            ? "Las ventas guardadas no se pueden desmarcar · Las nuevas sí"
            : "Puedes marcar y desmarcar las ventas antes de guardar"}
        </p>

        <p className="text-[10px] font-black text-[#1b2559]">
          {selectedCount} / {target}
        </p>
      </div>
    </div>
  );
}
