import type { Entry } from "./types";
import { escapeXml, getMonthLabel, normalizeEntryItems } from "./utils";

export function createProgressImage(entry: Entry) {
  const items = normalizeEntryItems(entry);
  const counts = {
    fibra: items.filter((item) => item.category === "fibra").length,
    luz: items.filter((item) => item.category === "luz").length,
    gas: items.filter((item) => item.category === "gas").length,
  };
  const processing = items.filter((item) => item.state === "procesando").length;
  const finished = items.filter((item) => item.state === "finalizado").length;
  const rejected = items.filter((item) => item.state === "rechazado").length;
  const total = items.length;
  const target = Math.max(1, entry.snapshot.totalTarget || 0);
  const progress = Math.min(100, Math.round((total / target) * 100));
  const month = getMonthLabel(entry.monthKey);
  const name = escapeXml(
    entry.snapshot.name || entry.userEmail || "Distribuidor",
  );
  const plan = escapeXml(entry.snapshot.planLabel || "Plan");

  const serviceCard = (
    x: number,
    label: string,
    count: number,
    targetValue: number,
    icon: string,
    accent: string,
  ) => {
    const pct =
      targetValue > 0
        ? Math.min(100, Math.round((count / targetValue) * 100))
        : 0;
    return `
      <rect x="${x}" y="330" width="330" height="170" rx="22" fill="#f7f8fb" stroke="#e5e7ee"/>
      <text x="${x + 28}" y="370" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#11183c">${icon}  ${label}</text>
      <text x="${x + 28}" y="418" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#11183c">${count} <tspan font-size="18" fill="#777b87">/ ${targetValue}</tspan></text>
      <rect x="${x + 28}" y="445" width="274" height="12" rx="6" fill="#e1e4eb"/>
      <rect x="${x + 28}" y="445" width="${Math.round((274 * pct) / 100)}" height="12" rx="6" fill="${accent}"/>
      <text x="${x + 302}" y="484" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${accent}">${pct}%</text>
    `;
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="header" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#11183c"/>
          <stop offset="100%" stop-color="#273471"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="#f5f6f9"/>
      <rect x="55" y="45" width="1090" height="810" rx="34" fill="white" stroke="#e2e5ec"/>
      <rect x="55" y="45" width="1090" height="205" rx="34" fill="url(#header)"/>
      <rect x="55" y="175" width="1090" height="75" fill="url(#header)"/>

      <text x="95" y="105" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="white">JSMILE</text>
      <text x="97" y="135" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="#c5ad75">DISTRIBUIDOR</text>
      <text x="1105" y="104" text-anchor="end" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#c5ad75">RESUMEN DE VENTAS</text>
      <text x="1105" y="136" text-anchor="end" font-family="Arial, sans-serif" font-size="16" fill="#cdd2e3">${escapeXml(month)}</text>

      <circle cx="110" cy="215" r="48" fill="#ffffff"/>
      <text x="110" y="226" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#1b2559">${escapeXml((entry.snapshot.name || entry.userEmail || "D").slice(0, 2).toUpperCase())}</text>
      <text x="180" y="211" font-family="Arial, sans-serif" font-size="25" font-weight="800" fill="white">${name}</text>
      <text x="180" y="238" font-family="Arial, sans-serif" font-size="15" fill="#cdd2e3">Distribuidor · ${plan}</text>

      <text x="95" y="295" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#777b87">PROGRESO DEL REGISTRO</text>
      <text x="1105" y="295" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#11183c">${total} / ${target} ventas · ${progress}%</text>
      <rect x="95" y="307" width="1010" height="10" rx="5" fill="#e1e4eb"/>
      <rect x="95" y="307" width="${Math.round((1010 * progress) / 100)}" height="10" rx="5" fill="#1b2559"/>

      ${serviceCard(95, "Fibra", counts.fibra, entry.snapshot.targets.fibra, "⌁", "#1b2559")}
      ${serviceCard(435, "Luz", counts.luz, entry.snapshot.targets.luz, "⚡", "#d59b00")}
      ${serviceCard(775, "Gas", counts.gas, entry.snapshot.targets.gas, "♨", "#d45b43")}

      <rect x="95" y="535" width="1010" height="145" rx="22" fill="#fafbfc" stroke="#e5e7ee"/>
      <text x="125" y="575" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="#777b87">ESTADO DE LAS VENTAS</text>

      <text x="125" y="625" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1b2559">En proceso</text>
      <text x="125" y="655" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#1b2559">${processing}</text>

      <line x1="385" y1="590" x2="385" y2="655" stroke="#e1e4eb"/>
      <text x="430" y="625" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0c8b58">Finalizadas</text>
      <text x="430" y="655" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#0c8b58">${finished}</text>

      <line x1="690" y1="590" x2="690" y2="655" stroke="#e1e4eb"/>
      <text x="735" y="625" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#c53b2f">Rechazadas</text>
      <text x="735" y="655" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#c53b2f">${rejected}</text>

      <line x1="960" y1="590" x2="960" y2="655" stroke="#e1e4eb"/>
      <text x="1005" y="625" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#11183c">Total</text>
      <text x="1005" y="655" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#11183c">${total}</text>

      <text x="600" y="755" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#1b2559">¡Seguimos conectando un mejor futuro!</text>
      <text x="600" y="790" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#858995">JSMILE · Resumen generado al guardar el registro</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
