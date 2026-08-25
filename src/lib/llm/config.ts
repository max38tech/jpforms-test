import { createAdminClient } from "@/lib/supabase/server";

export type LLMProvider = "gemini" | "openai" | "anthropic" | "custom";

export interface LLMConfig {
  provider: LLMProvider;
  apiKeys: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
    custom?: string;
  };
  /** For provider === "custom": any OpenAI-compatible endpoint. */
  custom?: {
    baseUrl: string;
    model: string;
  };
  /**
   * Model used for PDF form schema extraction ("Analyze with Gemini").
   * Always Gemini regardless of the chat provider above, since it requires
   * native PDF vision input.
   */
  schemaModel?: string;
}

const CONFIG_KEY = "chatbot_llm_config";

const DEFAULTS: LLMConfig = {
  provider: "gemini",
  apiKeys: {
    gemini: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    custom: process.env.CUSTOM_LLM_API_KEY,
  },
  custom: process.env.CUSTOM_LLM_BASE_URL
    ? {
        baseUrl: process.env.CUSTOM_LLM_BASE_URL,
        model: process.env.CUSTOM_LLM_MODEL || "openai/gpt-oss-120b",
      }
    : undefined,
  schemaModel: process.env.GEMINI_SCHEMA_MODEL || "gemini-2.0-flash",
};

export async function getLLMConfig(): Promise<LLMConfig> {
  const supabase = createAdminClient();
  try {
    const { data } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", CONFIG_KEY)
      .single();

    if (data?.value) return { ...DEFAULTS, ...data.value } as LLMConfig;
  } catch {
    // Supabase not configured yet — fall back to env
  }
  return DEFAULTS;
}

export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("system_config").upsert({
    key: CONFIG_KEY,
    value: config,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
