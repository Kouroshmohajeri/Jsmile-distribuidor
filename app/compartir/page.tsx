"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import QRCode from "qrcode";

export default function CompartirPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [qr, setQr] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError("");
    setShareUrl("");
    setQr("");
    setExpiresAt(null);

    try {
      // 1. Ask our server for a signed R2 upload URL.
      const response = await fetch("/api/share/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not prepare upload.");
      }

      // 2. Upload directly to Cloudflare R2.
      const uploadResponse = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": data.contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload to storage failed.");
      }

      // 3. Generate QR code for the share URL.
      const qrDataUrl = await QRCode.toDataURL(data.shareUrl, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      setShareUrl(data.shareUrl);
      setQr(qrDataUrl);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setShareUrl("");
    setQr("");
    setExpiresAt(null);
    setError("");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver
          </button>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Compartir archivo
          </h1>

          <p className="mt-2 text-gray-600">
            Sube una imagen y escanea el código QR desde tu móvil.
          </p>

          {!shareUrl ? (
            <div className="mt-8">
              <label
                htmlFor="file"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-10 text-center transition hover:border-gray-500"
              >
                <div className="text-4xl">📤</div>

                <div className="mt-3 font-medium text-gray-900">
                  Seleccionar imagen
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  JPG, PNG, WEBP o GIF · Máximo 25 MB
                </div>

                <input
                  id="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    setFile(selected);
                    setError("");
                  }}
                />
              </label>

              {file && (
                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <div className="font-medium text-gray-900">{file.name}</div>

                  <div className="mt-1 text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={!file || uploading}
                onClick={handleUpload}
                className="mt-6 w-full rounded-xl bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading ? "Subiendo..." : "Subir y generar QR"}
              </button>
            </div>
          ) : (
            <div className="mt-8 text-center">
              <div className="font-medium text-gray-900">
                ¡Listo! Escanea este código con tu móvil.
              </div>

              <div className="mx-auto mt-6 w-fit rounded-2xl border bg-white p-4 shadow-sm">
                <img
                  src={qr}
                  alt="Código QR para descargar el archivo"
                  width={320}
                  height={320}
                />
              </div>

              {expiresAt && (
                <p className="mt-4 text-sm text-gray-500">
                  Este enlace caduca en 1 hora.
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50"
                >
                  Copiar enlace
                </button>

                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-gray-800"
                >
                  Nuevo archivo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
