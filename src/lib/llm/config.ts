import { createAdminClient } from "@/lib/supabase/server";

export type LLMProvider = "gemini" | "openai" | "anthropic" | "custom";
export type SchemaProvider = "gemini" | "custom";

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
   * PDF form schema extraction ("Analyze with Gemini" button). Independent
   * of the chatbot provider above — you may want Gemini for chat but Qwen
   * (cheaper vision) or a higher-end model (better translation) for
   * extraction, or vice versa.
   */
  schemaProvider?: SchemaProvider;
  /** Model id used when schemaProvider === "gemini". */
  schemaModel?: string;
  /** Endpoint + model + key used when schemaProvider === "custom". Any
   *  OpenAI-compatible vision endpoint that accepts inline PDF/image file
   *  content in chat completions (OpenAI gpt-4o family, Qwen-VL / DashScope
   *  compatible-mode, OpenRouter vision models, etc.). */
  schemaCustom?: {
    baseUrl: string;
    model: string;
    apiKey?: string;
  };
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
  schemaProvider: "gemini",
  schemaModel: process.env.GEMINI_SCHEMA_MODEL || "gemini-2.0-flash",
  schemaCustom: process.env.SCHEMA_CUSTOM_BASE_URL
    ? {
        baseUrl: process.env.SCHEMA_CUSTOM_BASE_URL,
        model: process.env.SCHEMA_CUSTOM_MODEL || "qwen3.7-flash",
        apiKey: process.env.SCHEMA_CUSTOM_API_KEY,
      }
    : undefined,
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
