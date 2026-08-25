import { createAdminClient } from "@/lib/supabase/server";

export const SITE_CONTENT_KEY = "site_content";

export interface SiteContent {
  homepage_hero_title: string;
  homepage_hero_body: string;
  scrivener_partner_name: string;
  scrivener_office_name: string;
  scrivener_registration_number: string;
  scrivener_office_address: string;
  scrivener_office_contact: string;
  scrivener_notice_body: string;
  about_body: string;
  footer_disclaimer: string;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  homepage_hero_title: "Japanese Administrative Forms, In Your Language",
  homepage_hero_body:
    "Translate, complete, and download official Japanese government forms — immigration, ward office, tax, labor, and business.",
  scrivener_partner_name: "[Partner Gyoseishoshi full name — set in Admin → Site Content]",
  scrivener_office_name: "[Partner scrivener office name]",
  scrivener_registration_number: "[Registration number, e.g. 第XX-XXXXXX号]",
  scrivener_office_address: "[Partner office registered address]",
  scrivener_office_contact: "[Partner office phone / email]",
  scrivener_notice_body: `This platform is a software tool operated for informational, self-application purposes. It is not a licensed Gyoseishoshi (Administrative Scrivener) firm and does not itself perform the exclusive statutory duties reserved to licensed Gyoseishoshi under the Administrative Scrivener Act (行政書士法), including drafting of documents for submission to government offices for compensation (書類作成業務), agency filing (提出代理), and consultation services tied to such filings.

Where a user requires those services, this platform introduces the user to its partner Gyoseishoshi office, named above. Any engagement for legal representation, document drafting, or agency filing is a separate, direct contract formed exclusively between the user and the partner Gyoseishoshi office — not with this platform. This is required because, under Japanese law and current administrative guidance (including immigration procedure guidance), engagements for such regulated services must be direct between the client and the licensed professional; a non-licensed intermediary may not receive such engagements on the professional's behalf or subcontract them.

This platform does not receive compensation for, and is not a party to, any legal representation engagement. Fees for representation services are billed directly by the partner Gyoseishoshi office under its own terms.`,
  about_body:
    "JPForms helps foreign residents in Japan understand, translate, and self-complete official Japanese administrative forms.",
  footer_disclaimer:
    "Software translation utilities are for informational self-application. Official legal representation is provided by our licensed Gyoseishoshi / Shiho-shoshi partner firm.",
};

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", SITE_CONTENT_KEY)
      .single();
    if (data?.value) return { ...DEFAULT_SITE_CONTENT, ...data.value };
  } catch {
    // system_config not reachable yet (e.g. pre-Supabase-setup build)
  }
  return DEFAULT_SITE_CONTENT;
}

export async function saveSiteContent(content: Partial<SiteContent>): Promise<void> {
  const supabase = createAdminClient();
  const current = await getSiteContent();
  const next = { ...current, ...content };
  const { error } = await supabase.from("system_config").upsert({
    key: SITE_CONTENT_KEY,
    value: next,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
