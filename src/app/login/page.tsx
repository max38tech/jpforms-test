"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function LoginError() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;
  return (
    <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
      Sign-in failed: {error}
    </p>
  );
}

function SignInButton() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const { createBrowserClient } = await import("@supabase/auth-helpers-nextjs");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    callbackUrl.searchParams.set("next", next);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <Button onClick={signInWithGoogle} className="w-full" disabled={loading}>
      {loading ? "Redirecting to Google…" : "Continue with Google"}
    </Button>
  );
}

export default function LoginPage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Sign in with your Google account to fill forms and view your history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Suspense fallback={null}>
          <LoginError />
        </Suspense>
        <Suspense fallback={<Button className="w-full" disabled>Continue with Google</Button>}>
          <SignInButton />
        </Suspense>
      </CardContent>
    </Card>
  );
}
