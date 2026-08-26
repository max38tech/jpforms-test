import { getLLMConfig } from "@/lib/llm/config";

export interface ExtractResult {
  text: string;
  suggestedTitle?: string;
  method: "pdf-text" | "pdf-vision-ocr" | "docx" | "plain-text" | "image-vision-ocr";
  warning?: string;
}

const MAX_CHARS = 50000; // guard against pasting a book-length PDF into the KB

/** Extracts readable text from an uploaded file for use as knowledge-base content. */
export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractResult> {
  const suggestedTitle = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    return extractPdf(buffer, suggestedTitle);
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.toLowerCase().endsWith(".docx")
  ) {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: truncate(result.value.trim()),
      suggestedTitle,
      method: "docx",
      warning: result.messages.length
        ? `${result.messages.length} formatting warning(s) during conversion — text content should still be intact.`
        : undefined,
    };
  }

  if (mimeType.startsWith("text/") || /\.(txt|md)$/i.test(filename)) {
    return { text: truncate(buffer.toString("utf-8").trim()), suggestedTitle, method: "plain-text" };
  }

  if (mimeType.startsWith("image/")) {
    return extractImageOcr(buffer, mimeType, suggestedTitle);
  }

  throw new Error(
    `Unsupported file type: ${mimeType || filename}. Supported: PDF, DOCX, TXT/MD, JPG/PNG.`
  );
}

async function extractPdf(buffer: Buffer, suggestedTitle: string): Promise<ExtractResult> {
  // First try direct text extraction — works for text-layer PDFs, which
  // covers most official government form-instruction PDFs.
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = parsed.text.replace(/\n{3,}/g, "\n\n").trim();
    // A real text-layer PDF yields a decent amount of text per page. If
    // it's suspiciously short, this is likely a scanned/image-only PDF —
    // fall through to vision OCR instead.
    const numPages = parsed.pages?.length || 1;
    const charsPerPage = numPages > 0 ? text.length / numPages : text.length;
    if (text.length > 40 && charsPerPage > 30) {
      return { text: truncate(text), suggestedTitle, method: "pdf-text" };
    }
  } catch {
    // Fall through to OCR
  }

  return extractPdfVisionOcr(buffer, suggestedTitle);
}

async function extractPdfVisionOcr(buffer: Buffer, suggestedTitle: string): Promise<ExtractResult> {
  const config = await getLLMConfig();
  const apiKey = config.apiKeys.gemini || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "This PDF has no extractable text layer (likely scanned) and OCR requires a Gemini API key — set one in Admin → System & LLM Settings."
    );
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const base64 = buffer.toString("base64");

  const response = await ai.models.generateContent({
    model: config.schemaModel || "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          {
            text: "Extract all readable text from this document, preserving structure (headings, lists, paragraphs) as plain text. This is likely an official Japanese government form instruction sheet. Output only the extracted text, no commentary.",
          },
        ],
      },
    ],
    config: { temperature: 0.1 },
  });

  const text = (response.text ?? "").trim();
  if (!text) throw new Error("OCR produced no text — the PDF may be blank or unreadable.");

  return {
    text: truncate(text),
    suggestedTitle,
    method: "pdf-vision-ocr",
    warning: "This PDF had no text layer, so text was extracted via AI OCR — please proofread before saving.",
  };
}

async function extractImageOcr(
  buffer: Buffer,
  mimeType: string,
  suggestedTitle: string
): Promise<ExtractResult> {
  const config = await getLLMConfig();
  const apiKey = config.apiKeys.gemini || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Image text extraction requires a Gemini API key — set one in Admin → System & LLM Settings."
    );
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const base64 = buffer.toString("base64");

  const response = await ai.models.generateContent({
    model: config.schemaModel || "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          {
            text: "Extract all readable text from this image, preserving structure. If it's a form or instruction sheet, keep field labels and paragraphs organized. Output only the extracted text, no commentary.",
          },
        ],
      },
    ],
    config: { temperature: 0.1 },
  });

  const text = (response.text ?? "").trim();
  if (!text) throw new Error("No text found in the image.");

  return {
    text: truncate(text),
    suggestedTitle,
    method: "image-vision-ocr",
    warning: "Text was extracted via AI OCR — please proofread before saving.",
  };
}

function truncate(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  return text.slice(0, MAX_CHARS) + "\n\n[...truncated — content exceeded 50,000 characters]";
}
