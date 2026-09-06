import AuthButtons from "./components/AuthButtons";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f5f8] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-bold tracking-[3px] uppercase text-[#8a7b4f] mb-3">
        jsmile.es
      </p>
      <h1 className="text-3xl font-extrabold text-[#12141c] mb-3">
        Panel Distribuidor/a
      </h1>
      <p className="text-[#5b5f6b] max-w-sm mb-8">
        Accede con tu email y el código de tu aplicación de autenticación para
        ver tus documentos, plataformas y registrar tus ventas del mes.
      </p>

      <AuthButtons />
    </main>
  );
}
