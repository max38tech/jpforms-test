import { NextResponse } from "next/server";
import { createServerComponentClient, createAdminClient } from "@/lib/supabase/server";
import { isValidLanguage, LANGUAGE_COOKIE } from "@/lib/language";

export const dynamic = "force-dynamic";

/**
 * Sets the site-wide language preference. Always sets a long-lived cookie
 * (works for anonymous visitors too); additionally persists to the user's
 * profile row when signed in, so their preference follows them across
 * devices/browsers on next login.
 */
export async function POST(req: Request) {
  const { language } = await req.json();
  if (!isValidLanguage(language))
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });

  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ preferred_language: language })
      .eq("id", session.user.id);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LANGUAGE_COOKIE, language, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
