import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface FillField {
  pdf_field_id: string;
  value: string;
}

/**
 * Fills a Japanese PDF template.
 * Strategy:
 *  1. If the PDF has AcroForm fields matching pdf_field_id, set them directly.
 *  2. Otherwise overlay text at field coordinates from schema (if provided),
 *     embedding Noto Sans JP for correct Japanese glyph rendering.
 */
export async function fillJapanesePdf(
  templateBytes: Uint8Array,
  values: Record<string, string>,
  fontBytes?: Uint8Array | null,
  overlays?: { pdf_field_id: string; x: number; y: number; size?: number }[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Try AcroForm direct fill first
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const fieldNames = new Set(fields.map((f) => f.getName()));

  for (const [name, value] of Object.entries(values)) {
    if (!fieldNames.has(name)) continue;
    try {
      const f = form.getField(name);
      // @ts-expect-error - PDFTextField specific
      if (typeof f.setText === "function" && typeof f.isCheckBox !== "function") {
        form.getTextField(name).setText(value);
      }
    } catch {
      // skip non-text fields
    }
  }

  // Overlay rendering for coordinate-mapped fields (non-AcroForm scans)
  if (overlays && overlays.length > 0) {
    if (fontBytes) {
      pdfDoc.registerFontkit(fontkit);
    }
    const font = fontBytes
      ? await pdfDoc.embedFont(fontBytes, { subset: true })
      : await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    for (const ov of overlays) {
      const text = values[ov.pdf_field_id];
      if (!text) continue;
      page.drawText(text, {
        x: ov.x,
        y: ov.y,
        size: ov.size ?? 12,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }

  return await pdfDoc.save();
}
