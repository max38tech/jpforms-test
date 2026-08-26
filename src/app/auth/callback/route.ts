import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next");

  // Only allow same-site relative redirects (never an absolute/external URL)
  // to avoid this becoming an open redirect.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, requestUrl)
    );
  }

  const response = NextResponse.redirect(new URL(safeNext, requestUrl));

  if (code) {
    const supabase = createRouteHandlerClient(request, response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl)
      );
    }
  }

  return response;
}
