import { NextResponse } from "next/server";
import { createServerComponentClient, createAdminClient } from "@/lib/supabase/server";
import { fillJapanesePdf } from "@/lib/pdf/filler";
import type { FormField } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user)
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const { form_id, form_data } = await req.json();
    if (!form_id || !form_data)
      return NextResponse.json({ error: "form_id and form_data required" }, { status: 400 });

    const admin = createAdminClient();

    // Load form + schema
    const { data: form } = await admin.from("forms").select("*").eq("id", form_id).single();
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const { data: schemaRec } = await admin
      .from("form_schemas")
      .select("schema_json")
      .eq("form_id", form_id)
      .single();

    const fields: FormField[] = schemaRec?.schema_json?.fields ?? [];

    // Download the template PDF
    const { data: pdfBlob, error: dlErr } = await admin.storage
      .from("pdf-templates")
      .download(form.pdf_template_path);
    if (dlErr || !pdfBlob)
      return NextResponse.json({ error: "Template PDF not found" }, { status: 404 });

    const templateBytes = new Uint8Array(await pdfBlob.arrayBuffer());

    // Optionally load Noto Sans JP font from storage
    let fontBytes: Uint8Array | null = null;
    const { data: fontBlob } = await admin.storage
      .from("pdf-templates")
      .download("fonts/NotoSansJP-Regular.ttf");
    if (fontBlob) fontBytes = new Uint8Array(await fontBlob.arrayBuffer());

    // Build values map (only fields present in schema)
    const values: Record<string, string> = {};
    for (const f of fields) {
      const v = form_data[f.pdf_field_id];
      if (v !== undefined && v !== null) values[f.pdf_field_id] = String(v);
    }

    const filled = await fillJapanesePdf(templateBytes, values, fontBytes);

    // Save output to storage
    const outPath = `outputs/${session.user.id}/${Date.now()}-${form_id}.pdf`;
    const { error: upErr } = await admin.storage
      .from("pdf-templates")
      .upload(outPath, filled, { contentType: "application/pdf", upsert: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // Record submission
    const { data: submission, error: subErr } = await supabase
      .from("submissions")
      .insert({
        user_id: session.user.id,
        form_id,
        status: "completed",
        form_data,
        output_pdf_path: outPath,
      })
      .select()
      .single();
    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

    // Signed URL (1 hour)
    const { data: signed } = await admin.storage
      .from("pdf-templates")
      .createSignedUrl(outPath, 3600);

    return NextResponse.json({
      ok: true,
      submission_id: submission.id,
      download_url: signed?.signedUrl ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
