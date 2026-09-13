import type { Status } from "./types";

export function StatusPill({ status }: { status: Status }) {
  const config = {
    procesando: {
      label: "Procesando",
      className: "bg-blue-50 text-blue-700",
    },
    finalizado: {
      label: "Finalizado",
      className: "bg-emerald-50 text-emerald-700",
    },
    rechazado: {
      label: "Rechazado",
      className: "bg-red-50 text-red-700",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
