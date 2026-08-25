"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface HeaderUser {
  email: string;
  role: "user" | "admin";
}

const LANGS = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
];

export default function Header({
  user,
}: {
  user: HeaderUser | null;
}) {
  const router = useRouter();
  const [lang, setLang] = useState("en");

  async function signOut() {
    const { createBrowserClient } = await import("@supabase/auth-helpers-nextjs");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          🇯🇵 JPForms
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/forms" className="hover:underline">Form Library</Link>
          <span
            className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
            title="Legal representation provided by licensed partner Gyoseishoshi / Shiho-shoshi"
          >
            ⚖ Legal Scrivener Advisory
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href="/dashboard">Dashboard</a>
              </Button>
              {user.role === "admin" && (
                <Button variant="outline" size="sm" asChild>
                  <a href="/admin">Admin Portal</a>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <a href="/login">Sign in with Google</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
