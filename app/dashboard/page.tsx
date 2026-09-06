import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { requireUser } from "@/lib/auth";
import SalesRegister from "./SalesRegister";

const documents = [
  {
    title: "Plan Entrenamiento",
    description: "Formación y preparación",
    href: "/assets/plan-entrenamiento.pdf",
    type: "PDF",
  },

  {
    title: "Manual Distribuidor/a",
    description: "Guía de trabajo",
    href: "/assets/manual-distribuidor.pdf",
    type: "PDF",
  },

  {
    title: "Plan Carrera Jsmile",
    description: "Desarrollo profesional",
    href: "/assets/plan-carrera-jsmile.pdf",
    type: "PDF",
  },

  {
    title: "Promoción O2",
    description: "Promoción actual",
    href: "/assets/PromocionO2.JPG",
    type: "VER",
  },
];

const platforms = [
  {
    title: "Reporte final del día",
    description: "Formulario diario",
    href: "https://docs.google.com/forms/d/e/1FAIpQLScV3DkKmZJiYnld0bMWB-5I1j57d7156ncLqoFSwYEQI2lGBA/viewform",
    type: "FORM",
  },

  {
    title: "WiBe",
    description: "Wibeonline.es",
    href: "https://wibeonline.es",
    type: "WEB",
  },

  {
    title: "O2",
    description: "Plataforma comercial",
    href: "https://o2online.es/auth/login/?next=%2Fventas%2F&type=retail",
    type: "WEB",
  },

  {
    title: "Lowi",
    description: "Acceso comercial",
    href: "https://retailx.es/",
    type: "WEB",
  },

  {
    title: "Energía",
    description: "Comparador",
    href: "https://www.seplec.com/comparador",
    type: "WEB",
  },
];

function Arrow() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function PlatformIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 8h10" />
      <path d="M7 12h3" />
      <path d="M7 16h7" />
    </svg>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[2.5px] text-[#8a7b4f]">
        {eyebrow}
      </p>

      <h2 className="text-xl font-extrabold tracking-tight text-[#12141c]">
        {title}
      </h2>

      <p className="mt-1 text-sm text-[#777b87]">{description}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-[#f5f6f9] text-[#12141c]">
      {/* HERO */}
      <header className="overflow-hidden bg-[#11183c]">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-white">
                JS
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-[#aeb5d0]">
                  jsmile.es
                </p>

                <p className="text-sm font-bold text-white">
                  Panel Distribuidor/a
                </p>
              </div>
            </div>

            <UserButton />
          </div>

          <div className="mt-12 max-w-3xl">
            <p className="text-sm font-semibold text-[#b5bbd4]">
              Buenos días, {user.name.split(" ")[0]}
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Todo lo que necesitas,
              <br className="hidden sm:block" /> en un solo lugar.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-[#aeb5d0] sm:text-base">
              Gestiona tus herramientas, consulta tus documentos y registra tus
              ventas desde cualquier dispositivo.
            </p>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="relative mx-auto -mt-12 max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        {/* TOP STATUS */}
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-[0_15px_40px_rgba(18,20,28,.08)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#8a7b4f]">
              Tu cuenta
            </p>

            <p className="mt-2 text-lg font-extrabold capitalize">
              {user.role}
            </p>

            <p className="mt-1 text-xs text-[#777b87]">Acceso autorizado</p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-[0_15px_40px_rgba(18,20,28,.08)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#8a7b4f]">
              Modelo de comisión
            </p>

            <p className="mt-2 text-lg font-extrabold">
              Modelo {user.comisionModel}
            </p>

            <p className="mt-1 text-xs text-[#777b87]">
              Aplicado a tus estimaciones
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-[0_15px_40px_rgba(18,20,28,.08)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#8a7b4f]">
              Supervisor
            </p>

            <p className="mt-2 truncate text-lg font-extrabold">
              {user.supervisor}
            </p>

            <p className="mt-1 text-xs text-[#777b87]">
              Tu referencia de equipo
            </p>
          </div>
        </div>

        {/* DESKTOP RESOURCE GRID */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* DOCUMENTS */}
          <section className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-[0_12px_35px_rgba(18,20,28,.055)] sm:p-6">
            <SectionHeader
              eyebrow="Recursos"
              title="Documentos"
              description="Materiales de formación y referencia."
            />

            <div className="grid gap-2">
              {documents.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  target={item.type === "PDF" ? undefined : "_blank"}
                  rel={item.type === "PDF" ? undefined : "noopener noreferrer"}
                  download={item.type === "PDF"}
                  className="group flex items-center gap-4 rounded-2xl border border-[#eceef2] bg-[#fafbfc] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#cdd2e3] hover:bg-white hover:shadow-md"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef0f8] text-[#1b2559]">
                    <DocumentIcon />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">
                      {item.title}
                    </p>

                    <p className="mt-0.5 text-xs text-[#858995]">
                      {item.description}
                    </p>
                  </div>

                  <span className="hidden rounded-full bg-[#f0f1f6] px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-[#5c6274] sm:block">
                    {item.type}
                  </span>

                  <Arrow />
                </a>
              ))}
            </div>
          </section>

          {/* PLATFORMS */}
          <section className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-[0_12px_35px_rgba(18,20,28,.055)] sm:p-6">
            <SectionHeader
              eyebrow="Herramientas"
              title="Platforms"
              description="Tus plataformas de trabajo diario."
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {platforms.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#eceef2] bg-[#fafbfc] p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#cdd2e3] hover:bg-white hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0f8] text-[#1b2559]">
                    <PlatformIcon />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">
                      {item.title}
                    </p>

                    <p className="truncate text-xs text-[#858995]">
                      {item.description}
                    </p>
                  </div>

                  <Arrow />
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* SALES */}
        <section className="mt-5">
          <SalesRegister commissionModel={user.comisionModel} />
        </section>

        <footer className="py-8 text-center text-[10px] font-bold uppercase tracking-[2px] text-[#a0a4ae]">
          jsmile.es · Panel Distribuidor/a
        </footer>
      </div>
    </main>
  );
}
