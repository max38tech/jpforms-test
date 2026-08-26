import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getOrCreateDraft } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const { form_id } = await req.json();
    if (!form_id) return NextResponse.json({ error: "form_id required" }, { status: 400 });
    const draft = await getOrCreateDraft(session.user.id, form_id);
    return NextResponse.json({ submission: draft });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to start form" },
      { status: 500 }
    );
  }
}
