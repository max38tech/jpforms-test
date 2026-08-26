import { createAdminClient } from "@/lib/supabase/server";
import { getLLMConfig, type LLMConfig } from "@/lib/llm/config";
import { getSiteContent } from "@/lib/site-content";
import { LANGUAGE_NAMES } from "@/lib/language";
import type { Language } from "@/lib/types";

/** Generates a 1536-dim embedding via Gemini text-embedding model. */
export async function generateEmbedding(text: string, config?: LLMConfig): Promise<number[]> {
  const cfg = config ?? (await getLLMConfig());
  const apiKey = cfg.apiKeys.gemini || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("No Gemini API key configured for embeddings");

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.embedContent({
    model: cfg.embeddingModel || "gemini-embedding-001",
    contents: [text],
    config: { outputDimensionality: 1536 },
  });
  return response.embeddings?.[0]?.values ?? [];
}

/** Cosine-similarity retrieval over the knowledge_base via pgvector RPC. */
export async function retrieveContext(
  query: string,
  matchCount = 5,
  category?: string
): Promise<{ title: string; content: string; similarity: number }[]> {
  const embedding = await generateEmbedding(query);
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: matchCount,
    p_category: category ?? null,
  });
  if (error) throw new Error(`RAG retrieval failed: ${error.message}`);
  return data ?? [];
}

/**
 * Builds the chat system prompt.
 *
 * Knowledge-base documents are typically written in Japanese and/or
 * English by the admin, but the chatbot serves users in 5 languages. The
 * prompt below explicitly instructs the model to TRANSLATE retrieved
 * content into the target language rather than relying on it to infer
 * the right language from short/ambiguous user messages (e.g. "hi",
 * "sole proprietorship?") — language is now an explicit site-wide user
 * preference (see LanguageProvider / the header selector), not a guess.
 */
export async function buildRagSystemPrompt(
  context: { title: string; content: string }[],
  language: Language = "en"
): Promise<string> {
  const contextText = context
    .map((c) => `## ${c.title}\n${c.content}`)
    .join("\n\n");

  const site = await getSiteContent();
  const hasScrivenerInfo =
    site.scrivener_partner_name && !site.scrivener_partner_name.startsWith("[");

  const scrivenerLine = hasScrivenerInfo
    ? `This company has a licensed Gyoseishoshi (Administrative Scrivener) on staff as a partner: ${site.scrivener_partner_name}${site.scrivener_office_name ? ` of ${site.scrivener_office_name}` : ""}. For anything requiring licensed legal representation, document review, or agency filing, tell the user this company can connect them directly with our partner scrivener — do NOT tell them to go find a scrivener elsewhere or search the internet.`
    : `This company partners with a licensed Gyoseishoshi (Administrative Scrivener) for legal representation matters. For anything requiring licensed legal representation, tell the user this company can connect them with their partner scrivener — do NOT tell them to search the internet or find a scrivener elsewhere. (Admin note: fill in scrivener details in Admin → Site Content for a more specific answer here.)`;

  const languageName = LANGUAGE_NAMES[language] ?? "English";

  return `You are the support assistant for a Japanese administrative form automation platform, helping foreign residents in Japan navigate Japanese government paperwork, visas, and ward office procedures.

RESPONSE LANGUAGE: The user has selected ${languageName} as their site language. Respond ONLY in ${languageName}, regardless of what language the user's message or the retrieved knowledge-base context below is written in. If the knowledge base context is in Japanese or English, translate the relevant information into ${languageName} for your answer — do not quote it untranslated. Keep official Japanese terms (form names, government office names) in their original Japanese with a ${languageName} translation/explanation alongside, e.g. "開業届 (Notification of Business Opening)".

Be warm, direct, and helpful — this is a paying customer trying to solve a real bureaucratic problem, not a generic search engine query. Base your answers primarily on the retrieved knowledge base context below.

${scrivenerLine}

If the knowledge base context below doesn't cover the user's question, say so honestly, but still try to be useful with general knowledge about Japanese administrative processes if you're confident it's accurate — do not simply redirect the user to search the internet themselves. If the question is about a specific form we might support, mention they can check the Form Library (/forms). If it's a legal representation matter (not just information), route them to the partner scrivener per the note above, not to an outside scrivener or lawyer.

Retrieved knowledge base context (translate into ${languageName} as needed):

${contextText || "(no relevant context found for this query — the knowledge base may not have content on this topic yet)"}`;
}
