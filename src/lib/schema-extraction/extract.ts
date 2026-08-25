import { SCHEMA_EXTRACTION_PROMPT, parseSchemaJson } from "@/lib/schema-extraction/prompt";

/** Extraction via Google's native @google/genai SDK (Gemini models). */
export async function extractFormSchemaGemini(
  pdfBytes: Uint8Array,
  apiKey: string,
  model = "gemini-2.0-flash"
): Promise<{ fields: unknown[] }> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const base64 = Buffer.from(pdfBytes).toString("base64");

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          { text: SCHEMA_EXTRACTION_PROMPT },
        ],
      },
    ],
    config: { temperature: 0.1 },
  });

  const text = response.text ?? "{}";
  return parseSchemaJson(text);
}

/**
 * Extraction via any OpenAI Chat Completions-compatible vision endpoint that
 * accepts an inline base64 PDF as a "file" content part — this convention is
 * used by OpenAI's gpt-4o family and by Alibaba's DashScope/Qwen
 * OpenAI-compatible mode (Qwen-VL / Qwen3.7-Flash etc). If a given provider
 * doesn't support this shape, the request will simply fail with a clear
 * error and the admin can fall back to Gemini.
 */
export async function extractFormSchemaCustom(
  pdfBytes: Uint8Array,
  opts: { baseUrl: string; model: string; apiKey?: string }
): Promise<{ fields: unknown[] }> {
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const dataUrl = `data:application/pdf;base64,${base64}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.apiKey) headers["Authorization"] = `Bearer ${opts.apiKey}`;

  const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: opts.model,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              file: { filename: "form.pdf", file_data: dataUrl },
            },
            { type: "text", text: SCHEMA_EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Custom vision model error ${res.status}: ${body.slice(0, 300)}. ` +
        `Confirm this endpoint/model supports inline PDF file input in chat completions.`
    );
  }

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "{}";
  return parseSchemaJson(text);
}
