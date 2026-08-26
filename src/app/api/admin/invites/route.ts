import { NextResponse } from "next/server";
import { isAdmin, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invites: data ?? [] });
}

/**
 * Pre-authorizes an email with a role. If that email has ALREADY signed in
 * at least once (profile row exists), the role is applied immediately and
 * the invite is marked consumed right away — no need to wait for a second
 * login. Otherwise it sits pending until handle_new_user picks it up on
 * their first sign-in.
 */
export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const { email, role } = await req.json();
    if (!email || typeof email !== "string")
      return NextResponse.json({ error: "email required" }, { status: 400 });
    const targetRole = role === "admin" ? "admin" : "user";

    const supabase = createAdminClient();
    const current = await getCurrentUser();
    const normalizedEmail = email.trim().toLowerCase();

    // Already has an account? Apply immediately.
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ role: targetRole })
        .eq("id", existingProfile.id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, applied: "immediately" });
    }

    // Otherwise, queue a pending invite for their first sign-in.
    const { error: upErr } = await supabase.from("admin_invites").upsert({
      email: normalizedEmail,
      role: targetRole,
      invited_by: current?.user.id ?? null,
      consumed_at: null,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, applied: "pending_first_login" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create invite" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("admin_invites")
    .delete()
    .ilike("email", email.trim().toLowerCase());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
