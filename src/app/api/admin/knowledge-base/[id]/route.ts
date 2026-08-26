import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/rag";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { id } = await params;
  try {
    const { title, content, category } = await req.json();
    if (!title || !content)
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });

    const embedding = await generateEmbedding(`${title}\n\n${content}`);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("knowledge_base")
      .update({ title, content, category: category || null, embedding })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
