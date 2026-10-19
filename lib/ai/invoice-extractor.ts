import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_PROMPT = `
Eres un extractor especializado en facturas eléctricas españolas. Analiza visualmente el documento completo, incluidas tablas pequeñas y todas las páginas. Devuelve únicamente JSON válido con las claves exactas del esquema.

REGLA CRÍTICA: EXTRAER LOS TRES CONSUMOS FACTURADOS EN kWh.
- consumoP1 = energía/consumo FACTURADO en periodo P1, Punta.
- consumoP2 = energía/consumo FACTURADO en periodo P2, Llano.
- consumoP3 = energía/consumo FACTURADO en periodo P3, Valle.
- Busca primero tablas o líneas tituladas “Consumo”, “Energía consumida”, “Energía facturada”, “Detalle del consumo”, “Consumo por periodos”, “P1/P2/P3”, “Punta/Llano/Valle” o equivalentes.
- Lee las columnas de kWh facturados de cada periodo. En tablas con filas P1/P2/P3, toma el valor de consumo/energía en kWh de cada fila, no el precio €/kWh ni el importe en euros.
- Si el consumo aparece dividido en varios tramos de la misma factura para el mismo periodo, suma solo los kWh facturados de ese periodo.
- NO uses lecturas anterior/actual del contador, números de contador, potencia máxima, porcentajes, precios ni importes en euros como consumo.
- NO intercambies P1, P2 y P3. P1=Punta, P2=Llano, P3=Valle.
- Si aparecen explícitamente los tres consumos en una tabla, extrae esos valores aunque también aparezcan lecturas del contador en otra tabla.
- Si después de revisar todo el documento no se puede identificar con fiabilidad un periodo, devuelve null para ese campo. No inventes ni derives el consumo que falta del total salvo que la factura indique claramente que el total es la suma de esos tres periodos y no haya otros componentes.

OTROS CAMPOS:
- potenciaP1 y potenciaP2: potencia CONTRATADA en kW, nunca la potencia máxima registrada.
- iva e ie: porcentaje numérico sin el símbolo %.
- diasFactura: días del periodo facturado.
- totalFacturaActual: total final a pagar, no la base imponible.
- alquilerEquipo: alquiler del contador/equipo.
- reactivaBonoSocial: importe de energía reactiva y/o financiación/bonificación del Bono Social que corresponda.
- otrosConceptos: otros conceptos adicionales; usa 0 si no existen.
- perfiles: no los extraigas ni calcules; el servidor fija perfilP1=20, perfilP2=80 y perfilP3=0.
- Usa números JSON con punto decimal. Para datos desconocidos usa null, excepto otrosConceptos, que será 0 si no existen.
- Combina información de todas las páginas. No uses conocimientos externos ni datos de otras facturas.

Antes de responder, revisa de nuevo las filas/columnas de consumo facturado y confirma que consumoP1, consumoP2 y consumoP3 son kWh de Punta, Llano y Valle, respectivamente.
`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");
  }

  return new GoogleGenAI({ apiKey });
}

// Replace this with a model ID supported by your Gemini API key.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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

/**
 * Receives base64-encoded PDF or image files.
 * Calls the official Google Gemini API directly.
 */
export async function extractInvoice(
  files: Array<{
    data: string;
    mimeType: string;
  }>,
): Promise<Record<string, unknown>> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY en las variables de entorno.");
  }

  if (!files.length) {
    throw new Error("No se recibió ningún documento de factura.");
  }

  const parts: Array<
    | { text: string }
    | {
        inlineData: {
          mimeType: string;
          data: string;
        };
      }
  > = [{ text: SYSTEM_PROMPT }];

  for (const [index, file] of files.entries()) {
    if (!MIME_TYPES.has(file.mimeType)) {
      throw new Error(`Formato no compatible: ${file.mimeType}`);
    }

    if (!file.data || !file.data.trim()) {
      throw new Error(`El documento ${index + 1} está vacío.`);
    }

    parts.push({
      text: `DOCUMENTO ${index + 1} DE ${files.length}. Tipo: ${file.mimeType}.`,
    });

    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data,
      },
    });
  }

  try {
    // Initialize Gemini directly using GEMINI_API_KEY.
    const ai = getGeminiClient();

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            potenciaP1: { type: Type.NUMBER, nullable: true },
            potenciaP2: { type: Type.NUMBER, nullable: true },
            consumoP1: { type: Type.NUMBER, nullable: true },
            consumoP2: { type: Type.NUMBER, nullable: true },
            consumoP3: { type: Type.NUMBER, nullable: true },
            perfilP1: { type: Type.NUMBER, nullable: true },
            perfilP2: { type: Type.NUMBER, nullable: true },
            perfilP3: { type: Type.NUMBER, nullable: true },
            iva: { type: Type.NUMBER, nullable: true },
            ie: { type: Type.NUMBER, nullable: true },
            diasFactura: { type: Type.NUMBER, nullable: true },
            reactivaBonoSocial: { type: Type.NUMBER, nullable: true },
            otrosConceptos: { type: Type.NUMBER },
            alquilerEquipo: { type: Type.NUMBER, nullable: true },
            totalFacturaActual: { type: Type.NUMBER, nullable: true },
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
        },
      },
    });

    const responseText = result.text;

    if (!responseText) {
      throw new Error("Gemini no devolvió contenido.");
    }

    return parseModelJson(responseText);
  } catch (error) {
    console.error("Gemini invoice extraction failed:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("GEMINI_API_KEY") ||
        error.message.includes("JSON válido") ||
        error.message.includes("Formato no compatible") ||
        error.message.includes("está vacío")
      ) {
        throw error;
      }
    }

    throw new Error(
      "Gemini no ha podido analizar la factura. Comprueba el modelo, la API key y los límites de la API e inténtalo de nuevo.",
    );
  }
}
