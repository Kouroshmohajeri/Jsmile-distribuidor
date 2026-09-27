"use client";

import { useState } from "react";
import type { InvoiceFields } from "@/lib/invoice-parser";

type Props = {
  onExtracted: (fields: InvoiceFields) => void;
};

type ApiResponse = {
  fields?: Partial<InvoiceFields>;
  warnings?: string[];
  error?: string;
};

const MAX_FILE_MB = 20;
const MAX_PAGES = 12;

export default function InvoiceImporter({ onExtracted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setWarnings([]);
    setFileName(file.name);
    setLoading(true);

    try {
      if (file.type !== "application/pdf") {
        throw new Error("Selecciona un archivo PDF.");
      }

      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        throw new Error(`La factura no puede superar ${MAX_FILE_MB} MB.`);
      }

      const arrayBuffer = await file.arrayBuffer();

      const pdfjs = await import("pdfjs-dist");

      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const pdf = await pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
      }).promise;

      if (pdf.numPages > MAX_PAGES) {
        throw new Error(
          `La factura tiene ${pdf.numPages} páginas. Se admiten hasta ${MAX_PAGES}.`,
        );
      }

      const pages: string[] = [];

      // Send every page, not only page 1.
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.8 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("No se pudo inicializar el renderizado del PDF.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        } as any).promise;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        const base64Image = dataUrl.split(",")[1];

        if (!base64Image) {
          throw new Error(`No se pudo convertir la página ${pageNumber}.`);
        }

        pages.push(base64Image);
        page.cleanup();
      }

      const response = await fetch("/api/read-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages }),
      });

      const data = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Error en el servidor al analizar la factura con IA.",
        );
      }

      if (!data.fields) {
        throw new Error("La IA no devolvió datos de factura válidos.");
      }

      onExtracted(data.fields as InvoiceFields);
      setWarnings(data.warnings ?? []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se ha podido leer la factura.",
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="rounded-3xl border border-[#e4e6ec] bg-white p-5 shadow-[0_12px_35px_rgba(18,20,28,.055)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-extrabold text-[#12141c]">
            Importar factura
          </p>
          <p className="mt-1 text-sm leading-5 text-[#777b87]">
            Sube tu factura PDF y analizaremos todas sus páginas para rellenar
            automáticamente los campos.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[#11183c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b2559]">
          {loading ? "Analizando factura..." : "Subir factura PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={loading}
            onChange={handleFile}
          />
        </label>
      </div>

      {fileName && !loading && (
        <div className="mt-4 rounded-xl bg-[#f5f6f9] px-4 py-3 text-sm text-[#5b5f6b]">
          <span className="font-semibold">Archivo:</span> {fileName}
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-xl bg-[#eef0f8] px-4 py-3 text-sm text-[#1b2559]">
          Gemini está leyendo la factura completa y comprobando los valores.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">
            Algunos campos necesitan revisión manual
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-800">
            {warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-[#858995]">
        La factura se procesa en el servidor mediante Gemini a través de
        OmniRoute. Los perfiles P1/P2/P3 se calculan a partir del consumo
        extraído y se validan antes de rellenar el formulario.
      </p>
    </div>
  );
}
