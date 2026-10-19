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
const ACCEPTED_FILES =
  ".pdf,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif";

export default function InvoiceImporter({ onExtracted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setError("");
    setWarnings([]);
    setFileName(file.name);
    setLoading(true);

    try {
      if (!file.size) throw new Error("El archivo está vacío.");
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        throw new Error(`La factura no puede superar ${MAX_FILE_MB} MB.`);
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      const mimeByExtension: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        heic: "image/heic",
        heif: "image/heif",
      };
      const mimeType =
        file.type && file.type !== "application/octet-stream"
          ? file.type.toLowerCase()
          : mimeByExtension[extension || ""];

      if (!mimeType || !mimeByExtension[extension || ""]) {
        throw new Error(
          "Selecciona una factura PDF o una imagen JPG, PNG, WEBP, HEIC o HEIF.",
        );
      }

      // Send original bytes; no browser-side base64 conversion.
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await fetch("/api/read-bill", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Error al analizar la factura con Gemini.",
        );
      }
      if (!data.fields) {
        throw new Error("Gemini no devolvió datos de factura válidos.");
      }

      onExtracted(data.fields as InvoiceFields);
      setWarnings(data.warnings ?? []);
    } catch (err) {
      console.error("Invoice import error:", err);
      setError(
        err instanceof Error ? err.message : "No se ha podido leer la factura.",
      );
    } finally {
      setLoading(false);
      input.value = "";
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
            Sube una factura PDF o una imagen para extraer automáticamente los
            datos de electricidad.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[#11183c] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1b2559]">
          {loading ? "Analizando factura..." : "Subir factura"}
          <input
            type="file"
            accept={ACCEPTED_FILES}
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
          Gemini está analizando el documento y extrayendo los datos de la
          factura...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
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
        Formatos admitidos: PDF, JPG, JPEG, PNG, WEBP, HEIC y HEIF.
      </p>
    </div>
  );
}
