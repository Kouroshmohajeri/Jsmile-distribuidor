import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const SYSTEM_PROMPT = `
Extrae los datos de esta factura de electricidad española y devuelve SOLO JSON.

Prioridad máxima: localizar la tabla de ENERGÍA/CONSUMO FACTURADO en kWh.
- consumoP1 = energía facturada en Punta (P1).
- consumoP2 = energía facturada en Llano (P2).
- consumoP3 = energía facturada en Valle (P3).
- Copia los valores de kWh de cada periodo; no uses lecturas del contador, potencia, precios €/kWh ni importes en euros.
- Busca en todas las páginas. La tabla puede tener columnas o filas por periodo.
- Si hay varias tablas, usa la que corresponde al periodo facturado actual y suma únicamente líneas de energía facturada del mismo periodo, sin duplicar subtotales.
- Si un valor no se puede leer con seguridad, devuelve null; no lo inventes.
- potenciaP1 y potenciaP2 son potencias contratadas en kW.
- iva e ie son porcentajes numéricos sin %.
- diasFactura son los días del periodo facturado.
- totalFacturaActual es el total FINAL a pagar, impuestos incluidos.
- alquilerEquipo es el alquiler del contador/equipo.
- reactivaBonoSocial es el importe de reactiva y/o financiación/bonificación del Bono Social.
- otrosConceptos son otros conceptos adicionales; usa 0 si no hay ninguno.
- perfilP1 = 20, perfilP2 = 80, perfilP3 = 0. No calcules ni derives el perfil a partir del consumo.
Usa números JSON, sin unidades ni símbolos. No añadas explicaciones.
`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");
  }
  return new GoogleGenAI({ apiKey });
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const nullableNumber = {
  type: Type.NUMBER,
  nullable: true,
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    potenciaP1: nullableNumber,
    potenciaP2: nullableNumber,
    consumoP1: nullableNumber,
    consumoP2: nullableNumber,
    consumoP3: nullableNumber,
    perfilP1: { type: Type.NUMBER },
    perfilP2: { type: Type.NUMBER },
    perfilP3: { type: Type.NUMBER },
    iva: nullableNumber,
    ie: nullableNumber,
    diasFactura: nullableNumber,
    reactivaBonoSocial: { type: Type.NUMBER },
    otrosConceptos: { type: Type.NUMBER },
    alquilerEquipo: { type: Type.NUMBER },
    totalFacturaActual: nullableNumber,
  },
  required: [
    "potenciaP1",
    "potenciaP2",
    "consumoP1",
    "consumoP2",
    "consumoP3",
    "perfilP1",
    "perfilP2",
    "perfilP3",
    "iva",
    "ie",
    "diasFactura",
    "reactivaBonoSocial",
    "otrosConceptos",
    "alquilerEquipo",
    "totalFacturaActual",
  ],
};

const MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function parseModelJson(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("La respuesta JSON no es un objeto.");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(
      "Gemini no devolvió un objeto JSON válido. Inténtalo de nuevo.",
    );
  }
}

/** Uploads the original document to Gemini Files API, then asks Gemini to extract fields. */
export async function extractInvoice(
  files: Array<{ data: Uint8Array; mimeType: string; fileName?: string }>,
): Promise<Record<string, unknown>> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");
  }
  if (!files.length) {
    throw new Error("No se recibió ningún documento de factura.");
  }
  if (files.length > 1) {
    throw new Error("Envía una factura por solicitud.");
  }

  const file = files[0];
  if (!MIME_TYPES.has(file.mimeType)) {
    throw new Error(`Formato no compatible: ${file.mimeType}`);
  }
  if (!file.data?.byteLength) {
    throw new Error("El documento está vacío.");
  }

  const ai = getGeminiClient();
  let uploadedName: string | undefined;

  try {
    // Upload the original bytes directly; no base64 expansion or inlineData payload.
    const uploaded = await ai.files.upload({
      file: new Blob([new Uint8Array(file.data)], { type: file.mimeType }),
      config: {
        mimeType: file.mimeType,
        displayName: file.fileName || "invoice",
      },
    });

    uploadedName = uploaded.name;
    if (!uploaded.uri || !uploaded.mimeType) {
      throw new Error("Gemini no devolvió la referencia del archivo subido.");
    }

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_PROMPT },
            {
              fileData: {
                fileUri: uploaded.uri,
                mimeType: uploaded.mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    if (!result.text) {
      throw new Error("Gemini no devolvió contenido.");
    }

    const fields = parseModelJson(result.text);
    fields.perfilP1 = 20;
    fields.perfilP2 = 80;
    fields.perfilP3 = 0;
    return fields;
  } catch (error) {
    console.error("Gemini invoice extraction failed:", error);
    if (
      error instanceof Error &&
      (error.message.includes("GEMINI_API_KEY") ||
        error.message.includes("JSON válido") ||
        error.message.includes("Formato no compatible") ||
        error.message.includes("está vacío"))
    ) {
      throw error;
    }
    throw new Error(
      "Gemini no ha podido analizar la factura. Comprueba el modelo, la API key y los límites de la API e inténtalo de nuevo.",
    );
  } finally {
    // Files API uploads persist temporarily; delete the document after processing.
    if (uploadedName) {
      try {
        await ai.files.delete({ name: uploadedName });
      } catch (cleanupError) {
        console.warn(
          "No se pudo eliminar el archivo temporal de Gemini:",
          cleanupError,
        );
      }
    }
  }
}
