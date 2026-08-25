import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/header";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JPForms — Japan Form Automation Platform",
  description:
    "Translate and auto-fill official Japanese administrative forms in your language.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const current = await getCurrentUser();

  return (
    <html lang="en">
      <body className="antialiased">
        <Header
          user={current ? { email: current.user.email ?? "", role: current.role } : null}
        />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t py-6 text-center text-xs text-muted-foreground">
          <div className="flex justify-center gap-4">
            <a href="/about">About Us</a>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/tokushoho">特定商取引法に基づく表記</a>
          </div>
          <p className="mt-2">
            Software translation utilities are for informational self-application.
            Official legal representation is provided by our licensed Gyoseishoshi /
            Shiho-shoshi partner firm.
          </p>
        </footer>
      </body>
    </html>
  );
}
