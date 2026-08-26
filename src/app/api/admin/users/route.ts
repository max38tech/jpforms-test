import { NextResponse } from "next/server";
import { isAdmin, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (profiles ?? []).map((p) => p.id);

  const [{ data: submissions }, { data: credits }] = await Promise.all([
    supabase.from("submissions").select("user_id, status").in("user_id", ids),
    supabase.from("page_credits").select("user_id, delta, expires_at").in("user_id", ids),
  ]);

  const submissionCounts: Record<string, { total: number; completed: number }> = {};
  for (const s of submissions ?? []) {
    submissionCounts[s.user_id] ??= { total: 0, completed: 0 };
    submissionCounts[s.user_id].total++;
    if (s.status === "completed") submissionCounts[s.user_id].completed++;
  }

  const now = Date.now();
  const balances: Record<string, number> = {};
  for (const c of credits ?? []) {
    if (c.expires_at && new Date(c.expires_at).getTime() < now) continue;
    balances[c.user_id] = (balances[c.user_id] ?? 0) + c.delta;
  }

  const users = (profiles ?? []).map((p) => ({
    ...p,
    submissions: submissionCounts[p.id] ?? { total: 0, completed: 0 },
    page_balance: balances[p.id] ?? 0,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const { user_id, role, grant_pages } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const supabase = createAdminClient();

    if (role !== undefined) {
      if (!["user", "admin"].includes(role))
        return NextResponse.json({ error: "role must be 'user' or 'admin'" }, { status: 400 });

      // Guard against locking everyone out by demoting the last admin.
      if (role === "user") {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        const { data: target } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user_id)
          .single();
        if (target?.role === "admin" && (count ?? 0) <= 1) {
          return NextResponse.json(
            { error: "Cannot demote the last remaining admin." },
            { status: 400 }
          );
        }
      }

      const { error } = await supabase.from("profiles").update({ role }).eq("id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (grant_pages) {
      const current = await getCurrentUser();
      const pages = Number(grant_pages);
      if (!Number.isFinite(pages) || pages === 0)
        return NextResponse.json({ error: "grant_pages must be a non-zero number" }, { status: 400 });

      const { error } = await supabase.from("page_credits").insert({
        user_id,
        delta: pages,
        reason: "admin_grant",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      void current; // reserved for future audit logging (who granted it)
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
