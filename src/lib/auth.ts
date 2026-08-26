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
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, preferred_language")
        .eq("id", session.user.id)
        .single();
      if (profile?.role === "admin") role = "admin";
      if (profile?.preferred_language) preferredLanguage = profile.preferred_language as Language;
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
