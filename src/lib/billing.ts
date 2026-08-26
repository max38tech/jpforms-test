import { createAdminClient } from "@/lib/supabase/server";

export interface BillingConfig {
  pricePerPageJpy: number;
  subscriptionPriceJpy: number;
  subscriptionPages: number;
  subscriptionDays: number;
}

const CONFIG_KEY = "billing_config";

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  pricePerPageJpy: 500,
  subscriptionPriceJpy: 2500,
  subscriptionPages: 30,
  subscriptionDays: 7,
};

export async function getBillingConfig(): Promise<BillingConfig> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", CONFIG_KEY)
      .single();
    if (data?.value) return { ...DEFAULT_BILLING_CONFIG, ...data.value };
  } catch {
    // system_config not reachable yet
  }
  return DEFAULT_BILLING_CONFIG;
}

export async function saveBillingConfig(config: Partial<BillingConfig>): Promise<void> {
  const supabase = createAdminClient();
  const current = await getBillingConfig();
  const next = { ...current, ...config };
  const { error } = await supabase.from("system_config").upsert({
    key: CONFIG_KEY,
    value: next,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Current available page-credit balance (sum of non-expired ledger deltas). */
export async function getPageBalance(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_page_balance", { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

/**
 * Atomically checks and consumes page credits for a submission download.
 * Returns { ok: true } and inserts a negative ledger row if the user has
 * enough balance, otherwise { ok: false, balance, required }.
 */
export async function consumePageCredits(
  userId: string,
  pages: number,
  submissionId: string
): Promise<{ ok: boolean; balance: number; required: number }> {
  const balance = await getPageBalance(userId);
  if (balance < pages) return { ok: false, balance, required: pages };

  const supabase = createAdminClient();
  const { error } = await supabase.from("page_credits").insert({
    user_id: userId,
    delta: -pages,
    reason: "consume_download",
    submission_id: submissionId,
  });
  if (error) throw new Error(error.message);
  return { ok: true, balance: balance - pages, required: pages };
}
