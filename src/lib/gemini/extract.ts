import { GoogleGenAI } from "@google/genai";

const SCHEMA_PROMPT = `You are a Japanese administrative form analysis expert.
Analyze this official Japanese government PDF form. Identify every fillable field.
Return ONLY valid JSON (no markdown fences) in exactly this shape:
{
  "fields": [
    {
      "pdf_field_id": "applicant_name",
      "label_ja": "氏名",
      "label_en": "Full Name (as in Passport)",
      "label_vi": "Họ và tên đầy đủ",
      "label_zh": "姓名",
      "label_ko": "성명",
      "type": "text",
      "required": true
    }
  ]
}
Field types must be one of: text, textarea, date, number, select, checkbox.
Include labels in all five languages (ja, en, vi, zh, ko).`;

export async function extractFormSchema(
  pdfBytes: Uint8Array,
  apiKey: string
): Promise<{ fields: unknown[] }> {
  const ai = new GoogleGenAI({ apiKey });

  const base64 = Buffer.from(pdfBytes).toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          { text: SCHEMA_PROMPT },
        ],
      },
    ],
    config: { temperature: 0.1 },
  });

  const text = response.text ?? "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return { fields: parsed.fields ?? [] };
}
