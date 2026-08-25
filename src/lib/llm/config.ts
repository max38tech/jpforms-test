import { createAdminClient } from "@/lib/supabase/server";

export type LLMProvider = "gemini" | "openai" | "anthropic";

export interface LLMConfig {
  provider: LLMProvider;
  apiKeys: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
  };
}

const CONFIG_KEY = "chatbot_llm_config";

export async function getLLMConfig(): Promise<LLMConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .single();

  if (data?.value) return data.value as LLMConfig;

  // Fall back to env vars
  return {
    provider: "gemini",
    apiKeys: {
      gemini: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
    },
  };
}

export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("system_config").upsert({
    key: CONFIG_KEY,
    value: config,
    updated_at: new Date().toISOString(),
  });
}
