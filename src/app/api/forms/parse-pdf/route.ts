import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { extractFormSchema } from "@/lib/gemini/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { form_id } = await req.json();
  if (!form_id)
    return NextResponse.json({ error: "form_id required" }, { status: 400 });

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
      { status: 500 }
    );

  try {
    const supabase = createAdminClient();

    // Fetch template PDF from storage
    const { data: form } = await supabase
      .from("forms")
      .select("pdf_template_path")
      .eq("id", form_id)
      .single();
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const { data: pdfBlob, error: dlErr } = await supabase.storage
      .from("pdf-templates")
      .download(form.pdf_template_path);
    if (dlErr || !pdfBlob)
      return NextResponse.json({ error: "Failed to download template PDF" }, { status: 404 });

    const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const schema = await extractFormSchema(bytes, apiKey);

    // Upsert into form_schemas
    const { error: upErr } = await supabase.from("form_schemas").upsert(
      {
        form_id,
        schema_json: schema,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "form_id" }
    );
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      schema,
      model: process.env.GEMINI_SCHEMA_MODEL || "gemini-2.0-flash",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gemini extraction failed" },
      { status: 500 }
    );
  }
}
