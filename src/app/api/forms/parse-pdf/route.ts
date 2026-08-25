import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { getLLMConfig } from "@/lib/llm/config";
import {
  extractFormSchemaGemini,
  extractFormSchemaCustom,
} from "@/lib/schema-extraction/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { form_id } = await req.json();
  if (!form_id)
    return NextResponse.json({ error: "form_id required" }, { status: 400 });

  const llmConfig = await getLLMConfig();
  const schemaProvider = llmConfig.schemaProvider ?? "gemini";

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

    let schema: { fields: unknown[] };
    let modelLabel: string;

    if (schemaProvider === "custom") {
      const custom = llmConfig.schemaCustom;
      if (!custom?.baseUrl || !custom?.model) {
        return NextResponse.json(
          { error: "Custom schema extraction model is not configured. Set it in Admin → System & LLM Settings." },
          { status: 500 }
        );
      }
      schema = await extractFormSchemaCustom(bytes, custom);
      modelLabel = `${custom.model} (custom)`;
    } else {
      const apiKey = llmConfig.apiKeys.gemini || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const model = llmConfig.schemaModel || "gemini-2.0-flash";
      if (!apiKey) {
        return NextResponse.json(
          { error: "No Gemini API key configured. Set it in Admin → System & LLM Settings, or via GOOGLE_GENERATIVE_AI_API_KEY." },
          { status: 500 }
        );
      }
      schema = await extractFormSchemaGemini(bytes, apiKey, model);
      modelLabel = model;
    }

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

    return NextResponse.json({ ok: true, schema, model: modelLabel });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Schema extraction failed" },
      { status: 500 }
    );
  }
}
