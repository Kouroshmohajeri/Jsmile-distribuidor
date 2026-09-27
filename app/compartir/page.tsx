"use client";

import { useEffect, useState } from "react";

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
  const [isSnapshot, setIsSnapshot] = useState(false);
  const [snapshotPreview, setSnapshotPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      const dataUrl = sessionStorage.getItem("jsmile_share_snapshot");

      if (!dataUrl) {
        return;
      }

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        if (cancelled) {
          return;
        }

        const snapshotFile = new File([blob], "comparativa-iberdrola.jpg", {
          type: "image/jpeg",
        });

        setFile(snapshotFile);
        setSnapshotPreview(dataUrl);
        setIsSnapshot(true);

        // The snapshot only needs to survive the hand-off to this page.
        sessionStorage.removeItem("jsmile_share_snapshot");
      } catch {
        if (!cancelled) {
          setError("No se ha podido cargar el snapshot.");
        }
      }
    }

    void loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, []);

  function acceptDroppedFile(selected: File | null) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Solo se pueden subir imágenes.");
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      setError("La imagen no puede superar los 25 MB.");
      return;
    }
    setFile(selected);
    setSnapshotPreview("");
    setIsSnapshot(false);
    setShareUrl("");
    setQr("");
    setExpiresAt(null);
    setError("");
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptDroppedFile(event.dataTransfer.files?.[0] ?? null);
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  function handleDirectDownload() {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name || "comparativa-iberdrola.jpg";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    setIsSnapshot(false);
    setSnapshotPreview("");
  }

  return (
    <main
      className={`min-h-screen bg-[#f5f6f9] px-4 py-5 sm:px-6 sm:py-8 lg:px-8 ${
        isDragging ? "bg-[#eef0f8]" : ""
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#11183c]/10 p-6">
          <div className="rounded-3xl border-2 border-dashed border-[#11183c] bg-white px-10 py-12 text-center shadow-2xl">
            <div className="text-4xl">📤</div>
            <div className="mt-3 text-lg font-bold text-[#11183c]">
              Suelta la imagen aquí
            </div>
            <div className="mt-1 text-sm text-gray-500">
              JPG, PNG, WEBP o GIF · Máximo 25 MB
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-6xl">
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

        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_60px_rgba(18,20,28,.08)] lg:p-2">
          <div className="rounded-[1.35rem] bg-white p-5 sm:p-7 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Compartir archivo
            </h1>

            <p className="mt-2 text-gray-600">
              Sube una imagen y escanea el código QR desde tu móvil.
            </p>

            {!shareUrl ? (
              <div className="mt-8">
                {isSnapshot ? (
                  <div className="rounded-2xl border border-[#e4e6ec] bg-[#fafbfc] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef0f8] text-[#11183c]">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16l4.5-4.5a2 2 0 012.8 0L14 14l2.2-2.2a2 2 0 012.8 0L21 14"
                          />
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                        </svg>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-900">
                          Snapshot de la comparativa
                        </div>
                        <div className="text-sm text-gray-500">
                          Imagen lista para descargar o compartir.
                        </div>
                      </div>
                    </div>

                    {snapshotPreview && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <img
                          src={snapshotPreview}
                          alt="Vista previa del snapshot de la comparativa"
                          className="block h-auto max-h-[520px] w-full object-contain"
                        />
                      </div>
                    )}

                    {file && (
                      <>
                        <div className="mt-4 text-sm text-gray-500">
                          {file.name} · {(file.size / 1024 / 1024).toFixed(2)}{" "}
                          MB
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <label
                      htmlFor="file"
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${isDragging ? "border-[#11183c] bg-[#f4f5fa]" : "border-gray-300 hover:border-[#11183c] hover:bg-[#fafbfc]"}`}
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
                          acceptDroppedFile(selected);
                        }}
                      />
                    </label>

                    {file && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-4">
                        <div className="font-medium text-gray-900">
                          {file.name}
                        </div>

                        <div className="mt-1 text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {isSnapshot ? (
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(shareUrl)}
                      disabled={!shareUrl || uploading}
                      className="rounded-xl border border-[#d8dbe4] bg-white px-4 py-3 font-semibold text-[#11183c] transition hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Copiar enlace
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectDownload}
                      disabled={!file || uploading}
                      className="rounded-xl bg-[#11183c] px-4 py-3 font-semibold text-white transition hover:bg-[#0b1030] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Descargar
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      disabled={uploading}
                      className="rounded-xl border border-[#d8dbe4] bg-white px-4 py-3 font-semibold text-[#12141c] transition hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Nuevo archivo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!file || uploading}
                    onClick={handleUpload}
                    className="mt-6 w-full rounded-xl bg-[#11183c] px-5 py-3 font-semibold text-white transition hover:bg-[#0b1030] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {uploading ? "Subiendo..." : "Subir y generar QR"}
                  </button>
                )}

                {isSnapshot && !shareUrl && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleUpload}
                    className="mt-3 w-full rounded-xl border border-[#d8dbe4] bg-[#f8f9fb] px-5 py-3 font-semibold text-[#12141c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {uploading ? "Generando QR…" : "Compartir por QR"}
                  </button>
                )}
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

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    className="rounded-xl border border-[#d8dbe4] bg-white px-4 py-3 font-semibold text-[#11183c] hover:bg-[#f7f8fb]"
                  >
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectDownload}
                    disabled={!file}
                    className="rounded-xl bg-[#11183c] px-4 py-3 font-semibold text-white hover:bg-[#0b1030] disabled:opacity-40"
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-xl border border-[#d8dbe4] bg-white px-4 py-3 font-semibold text-[#12141c] hover:bg-[#f7f8fb]"
                  >
                    Nuevo archivo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
