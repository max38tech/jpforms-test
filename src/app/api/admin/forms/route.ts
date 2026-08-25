import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ forms: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const formData = await req.formData();
    const pdf = formData.get("pdf") as File | null;
    const titleEn = formData.get("title_en") as string;
    const titleJa = formData.get("title_ja") as string;
    const category = formData.get("category") as string;

    if (!pdf || !titleEn || !titleJa)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const supabase = createAdminClient();
    const path = `templates/${Date.now()}-${pdf.name}`;

    const { error: upErr } = await supabase.storage
      .from("pdf-templates")
      .upload(path, await pdf.arrayBuffer(), { contentType: "application/pdf" });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data, error: insErr } = await supabase
      .from("forms")
      .insert({
        title_en: titleEn,
        title_ja: titleJa,
        category,
        pdf_template_path: path,
      })
      .select()
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, form: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("forms").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
