export const SCHEMA_EXTRACTION_PROMPT = `You are a Japanese administrative form analysis expert.
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

export function parseSchemaJson(text: string): { fields: unknown[] } {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return { fields: parsed.fields ?? [] };
}
