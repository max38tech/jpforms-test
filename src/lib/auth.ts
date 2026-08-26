import { createServerComponentClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { Language } from "@/lib/types";

export interface CurrentUser {
  user: User;
  role: "user" | "admin";
  preferredLanguage: Language;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = createServerComponentClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return null;

    let role: "user" | "admin" = "user";
    let preferredLanguage: Language = "en";
    try {
      // Select role and preferred_language separately: if migration 0004
      // (which adds preferred_language) hasn't been run yet in this
      // environment, a combined select silently returns { data: null,
      // error } from supabase-js rather than throwing — which would
      // otherwise make a real admin's role incorrectly resolve to "user"
      // just because an unrelated column is missing. Role must never be
      // collateral damage from an unrelated schema gap.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profile?.role === "admin") role = "admin";

      const { data: langRow } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", session.user.id)
        .single();
      if (langRow?.preferred_language) preferredLanguage = langRow.preferred_language as Language;
    } catch {
      // default to user / en
    }
    return { user: session.user, role, preferredLanguage };
  } catch {
    // Supabase not configured yet (e.g., first Vercel build)
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const current = await getCurrentUser();
  return current?.role === "admin";
}
