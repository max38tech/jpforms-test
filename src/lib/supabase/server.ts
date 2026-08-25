import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Build-time safe: Next.js prerenders pages during `next build` even before
 * Supabase env vars exist. We fall back to placeholder credentials so client
 * construction never throws; actual data calls simply fail gracefully until
 * real values are configured (locally or in Vercel).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createServerComponentClient(): SupabaseClient {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => {
        try {
          return cookies().getAll();
        } catch {
          return [];
        }
      },
      setAll: () => {},
    },
  });
}

/**
 * For Route Handlers (e.g. /auth/callback) that need to WRITE session
 * cookies, not just read them. Server Components can't set cookies (Next.js
 * forbids it), which is why createServerComponentClient's setAll is a no-op —
 * but a Route Handler returning a NextResponse can and must, or the session
 * from exchangeCodeForSession() is silently dropped and the user never
 * actually gets logged in.
 */
export function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
): SupabaseClient {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) =>
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
    },
  });
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
