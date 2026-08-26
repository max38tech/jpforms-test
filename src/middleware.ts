import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (cs) => cs.forEach(({ name, value }) => res.cookies.set(name, value)) } }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  // Protect /dashboard and /submissions: require login
  if ((path.startsWith("/dashboard") || path.startsWith("/submissions")) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect /admin: require login + admin role
  if (path.startsWith("/admin")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/submissions/:path*"],
};
