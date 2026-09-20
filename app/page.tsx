import Link from "next/link";
import AuthButtons from "./components/AuthButtons";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f5f8] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-[3px] uppercase text-[#8a7b4f] mb-3">
            jsmile.es
          </p>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12141c] mb-3">
            Panel Distribuidor/a
          </h1>

          <p className="text-[#5b5f6b] max-w-md mx-auto">
            Selecciona una opción para continuar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Iniciar sesión */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-7 text-left shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#f4f0e5] flex items-center justify-center mb-5">
              <svg
                className="w-6 h-6 text-[#8a7b4f]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-[#12141c] mb-2">
              Iniciar sesión
            </h2>

            <p className="text-sm leading-6 text-[#6b7280] mb-6">
              Accede a tu panel para consultar documentos, plataformas y
              registrar tus ventas.
            </p>

            <AuthButtons />
          </div>

          {/* Compartir */}
          <Link
            href="/compartir"
            className="group bg-[#12141c] rounded-2xl p-7 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.5 12.5l7-7a3.536 3.536 0 015 5l-7 7a3.536 3.536 0 01-5-5l5-5a2.121 2.121 0 013 3l-5 5"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Compartir</h2>

            <p className="text-sm leading-6 text-white/65 mb-5">
              Comparte documentos y archivos fácilmente mediante un enlace.
            </p>

            <div className="flex items-center text-sm font-semibold text-white">
              Compartir archivos
              <svg
                className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14M13 6l6 6-6 6"
                />
              </svg>
            </div>
          </Link>
        </div>

        <p className="text-center text-xs text-[#9ca3af] mt-8">
          © {new Date().getFullYear()} jsmile.es
        </p>
      </div>
    </main>
  );
}
