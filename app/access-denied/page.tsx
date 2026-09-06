export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f8] flex items-center justify-center px-6">
      <div className="bg-white border border-[#e6e7ec] rounded-2xl p-8 shadow-sm text-center max-w-md">
        <p className="text-xs font-bold tracking-[3px] uppercase text-[#8a7b4f] mb-3">
          jsmile.es
        </p>

        <h1 className="text-2xl font-extrabold text-[#12141c] mb-3">
          Acceso no autorizado
        </h1>

        <p className="text-[#5b5f6b] text-sm">
          Tu cuenta existe, pero actualmente no tienes acceso a esta aplicación.
          Contacta con un administrador.
        </p>
      </div>
    </main>
  );
}
