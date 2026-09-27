import { NextResponse } from "next/server";

import {
  normalizeInvoiceFields,
  type InvoiceFields,
} from "@/lib/invoice-parser";

import { extractInvoice } from "@/lib/ai/invoice-extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGES = 12;

function getImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.length > 100 &&
      /^[A-Za-z0-9+/=]+$/.test(item),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const images = getImages(body?.pages);

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No se recibieron páginas de la factura." },
        { status: 400 },
      );
    }

    if (images.length > MAX_PAGES) {
      return NextResponse.json(
        {
          error: `Se admiten como máximo ${MAX_PAGES} páginas.`,
        },
        { status: 400 },
      );
    }

    const rawFields = await extractInvoice(images);

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

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido analizar la factura.",
      },
      { status: 500 },
    );
  }
}
