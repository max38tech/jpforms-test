import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/rag";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, title, content, category, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const { title, content, category } = await req.json();
    if (!title || !content)
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });

    const embedding = await generateEmbedding(`${title}\n\n${content}`);
    if (!embedding.length)
      return NextResponse.json(
        { error: "Failed to generate embedding — check the Gemini API key in Admin → System & LLM Settings." },
        { status: 500 }
      );

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("knowledge_base")
      .insert({ title, content, category: category || null, embedding })
      .select("id, title, content, category, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, document: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to add document" },
      { status: 500 }
    );
  }
}
