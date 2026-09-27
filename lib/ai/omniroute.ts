export type OmniMessageContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

function getConfig() {
  const baseUrl = process.env.OMNIROUTE_BASE_URL;
  const apiKey = process.env.OMNIROUTE_API_KEY;

  if (!baseUrl) {
    throw new Error("Missing OMNIROUTE_BASE_URL");
  }

  if (!apiKey) {
    throw new Error("Missing OMNIROUTE_API_KEY");
  }

  return {
    baseUrl,
    apiKey,
  };
}

export async function chatCompletion({
  model = "auto",
  messages,
  temperature = 0,
  maxTokens = 2000,
}: {
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | OmniMessageContent[];
  }>;
  temperature?: number;
  maxTokens?: number;
}) {
  const { baseUrl, apiKey } = getConfig();

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages,
    }),

    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`OmniRoute ${response.status}: ${text.slice(0, 500)}`);
  }

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("OmniRoute returned invalid JSON.");
  }

  const content = (
    data as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    }
  )?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI provider returned no content.");
  }

  return {
    content,
    model: (data as { model?: string })?.model,
    raw: data,
  };
}
