import { createServerComponentClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface CurrentUser {
  user: User;
  role: "user" | "admin";
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  let role: "user" | "admin" = "user";
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (profile?.role === "admin") role = "admin";
  } catch {
    // default to user
  }
  return { user: session.user, role };
}

export async function isAdmin(): Promise<boolean> {
  const current = await getCurrentUser();
  return current?.role === "admin";
}
