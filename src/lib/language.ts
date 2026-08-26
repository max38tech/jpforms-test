import { cookies } from "next/headers";
import type { Language } from "@/lib/types";

export const LANGUAGE_COOKIE = "jpforms_lang";

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  ja: "Japanese (日本語)",
  vi: "Vietnamese (Tiếng Việt)",
  zh: "Chinese (中文)",
  ko: "Korean (한국어)",
};

const VALID: Language[] = ["en", "ja", "vi", "zh", "ko"];

export function isValidLanguage(v: unknown): v is Language {
  return typeof v === "string" && (VALID as string[]).includes(v);
}

/**
 * Server-side site-wide language preference: cookie first (works for both
 * signed-in and anonymous visitors), falling back to 'en'. Call this from
 * Server Components/layouts; the cookie is set by /api/user/language
 * whenever the header selector changes.
 */
export function getPreferredLanguageFromCookie(): Language {
  try {
    const value = cookies().get(LANGUAGE_COOKIE)?.value;
    return isValidLanguage(value) ? value : "en";
  } catch {
    return "en";
  }
}
