import { getCurrentUser } from "@/lib/auth";
import { getSiteContent } from "@/lib/site-content";
import { getPreferredLanguageFromCookie } from "@/lib/language";
import { LanguageProvider } from "@/components/language-provider";
import Header from "@/components/header";
import ChatWidget from "@/components/chat-widget";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JPForms — Japan Form Automation Platform",
  description:
    "Translate and auto-fill official Japanese administrative forms in your language.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  themeColor: "#bc002d",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [current, content] = await Promise.all([getCurrentUser(), getSiteContent()]);
  // Signed-in users: their saved profile preference wins. Signed-out
  // visitors: fall back to whatever they last picked (cookie), or English.
  const initialLanguage = current?.preferredLanguage ?? getPreferredLanguageFromCookie();

  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider initialLanguage={initialLanguage}>
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
              <a href="/legal-scrivener">Legal Scrivener Advisory</a>
            </div>
            <p className="mt-2">{content.footer_disclaimer}</p>
          </footer>
          <ChatWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
