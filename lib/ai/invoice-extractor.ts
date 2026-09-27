import { chatCompletion } from "./omniroute";

const SYSTEM_PROMPT = `
Eres un extractor experto de facturas de electricidad españolas.

Lee TODAS las páginas y devuelve SOLO JSON válido.

REGLAS:

- No inventes valores. Si un dato no aparece claramente, usa null.
- P1 = Punta, P2 = Llano, P3 = Valle.
- Para consumo usa "consumo facturado" en kWh, NO lecturas del contador.
- Para potencia usa potencia CONTRATADA en kW, NO potencia máxima registrada.
- IVA/IGIC e impuesto eléctrico son porcentajes sin el símbolo %.
- diasFactura = días del periodo facturado.
- totalFacturaActual = total final a pagar.
- alquilerEquipo = alquiler de contador/equipo.
- reactivaBonoSocial = importe de reactiva y/o financiación/bonificación del Bono Social que corresponda.
- otrosConceptos = conceptos adicionales que no encajen en los campos anteriores; si no existen, 0.
- NO calcules perfiles: el servidor los calcula desde P1/P2/P3.
- Usa números JSON con punto decimal.

Antes de responder, comprueba visualmente:

1) que los tres consumos corresponden a Punta/Llano/Valle;
2) que no confundiste lecturas con consumo;
3) que la potencia es la contratada;
4) que el total de factura es el total final.

ESQUEMA:

{
  "potenciaP1": number|null,
  "potenciaP2": number|null,
  "consumoP1": number|null,
  "consumoP2": number|null,
  "consumoP3": number|null,
  "iva": number|null,
  "ie": number|null,
  "diasFactura": number|null,
  "reactivaBonoSocial": number|null,
  "otrosConceptos": number|null,
  "alquilerEquipo": number|null,
  "totalFacturaActual": number|null
}
`;

function parseModelJson(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error("La IA no devolvió un JSON válido.");
  }
}

export async function extractInvoice(images: string[]) {
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
    },
  ];

  images.forEach((image, index) => {
    content.push({
      type: "text",
      text: `PÁGINA ${index + 1} DE ${images.length}`,
    });

    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${image}`,
      },
    });
  });

  const result = await chatCompletion({
    // IMPORTANT:
    // Let OmniRoute choose the provider.
    model: process.env.OMNIROUTE_MODEL || "auto",
    temperature: 0,
    maxTokens: 2000,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  return parseModelJson(result.content);
}
