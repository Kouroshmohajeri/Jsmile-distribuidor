import { NextResponse } from "next/server";
import {
  normalizeInvoiceFields,
  type InvoiceFields,
} from "@/lib/invoice-parser";
import { extractInvoice } from "@/lib/ai/invoice-extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const ALLOWED_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

function resolveMimeType(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExtension = MIME_BY_EXTENSION[extension];
  const declared = file.type.toLowerCase();

  // Extensions are useful because some browsers report HEIC/HEIF as empty.
  const mimeType =
    declared && ALLOWED_TYPES.has(declared) ? declared : byExtension;

  return mimeType && ALLOWED_TYPES.has(mimeType) ? mimeType : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ninguna factura." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "La factura no puede superar 20 MB." },
        { status: 413 },
      );
    }

    const mimeType = resolveMimeType(file);
    if (!mimeType) {
      return NextResponse.json(
        {
          error: "Formato no compatible. Usa PDF, JPG, PNG, WEBP, HEIC o HEIF.",
        },
        { status: 400 },
      );
    }

    // Multipart uploads avoid JSON/base64 payload inflation between browser and server.
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawFields = await extractInvoice([
      { data: buffer.toString("base64"), mimeType },
    ]);

    const normalized = normalizeInvoiceFields(
      rawFields as Partial<Record<keyof InvoiceFields, unknown>>,
    );

    return NextResponse.json({
      fields: normalized.fields,
      warnings: normalized.validation.warnings,
      validation: normalized.validation,
    });
  } catch (error) {
    console.error("Invoice extraction error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se ha podido analizar la factura.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
