export type FieldType = "text" | "textarea" | "date" | "number" | "select" | "checkbox";

export interface FormField {
  pdf_field_id: string;
  label_ja: string;
  label_en: string;
  label_vi?: string;
  label_zh?: string;
  label_ko?: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface FormSchema {
  fields: FormField[];
}

export type Language = "en" | "ja" | "vi" | "zh" | "ko";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
];

export const CATEGORIES = [
  { value: "immigration", label: "Immigration" },
  { value: "ward_office", label: "Ward Office" },
  { value: "tax", label: "Tax" },
  { value: "labor", label: "Labor" },
  { value: "business", label: "Business" },
] as const;

export function fieldLabel(field: FormField, lang: Language): string {
  switch (lang) {
    case "ja": return field.label_ja;
    case "vi": return field.label_vi || field.label_en;
    case "zh": return field.label_zh || field.label_en;
    case "ko": return field.label_ko || field.label_en;
    default: return field.label_en;
  }
}
