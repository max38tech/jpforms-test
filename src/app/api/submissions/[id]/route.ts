import { NextResponse } from "next/server";
import { createServerComponentClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireOwner(id: string) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { error: "Authentication required", status: 401 as const };

  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();
  if (!submission) return { error: "Submission not found", status: 404 as const };
  if (submission.user_id !== session.user.id)
    return { error: "Forbidden", status: 403 as const };

  return { submission, userId: session.user.id };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await requireOwner(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ submission: result.submission });
}

/** Wizard autosave: persists answers + current step as the user progresses. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await requireOwner(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.submission.status !== "draft")
    return NextResponse.json({ error: "This submission is already completed and can no longer be edited." }, { status: 409 });

  try {
    const { form_data, current_step } = await req.json();
    const admin = createAdminClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (form_data !== undefined) updates.form_data = form_data;
    if (current_step !== undefined) updates.current_step = current_step;

    const { error } = await admin.from("submissions").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 }
    );
  }
}
