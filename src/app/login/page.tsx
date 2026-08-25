"use client";

import { Suspense } from "react";
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

async function signInWithGoogle() {
  const { createBrowserClient } = await import("@supabase/auth-helpers-nextjs");
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
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
        <Button onClick={signInWithGoogle} className="w-full">
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
