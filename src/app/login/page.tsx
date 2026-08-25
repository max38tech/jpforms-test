"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
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

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Sign in with your Google account to fill forms and view your history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={signInWithGoogle} className="w-full">
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
