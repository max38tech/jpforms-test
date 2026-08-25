import { createAdminClient } from "@/lib/supabase/server";
import { getLLMConfig, type LLMConfig } from "@/lib/llm/config";

/** Generates a 1536-dim embedding via Gemini text-embedding model. */
export async function generateEmbedding(text: string, config?: LLMConfig): Promise<number[]> {
  const cfg = config ?? (await getLLMConfig());
  const apiKey = cfg.apiKeys.gemini || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("No Gemini API key configured for embeddings");

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
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

export function buildRagSystemPrompt(context: {
  title: string;
  content: string;
}[]): string {
  const contextText = context
    .map((c) => `## ${c.title}\n${c.content}`)
    .join("\n\n");
  return `You are a helpful assistant for foreigners living in Japan who need help with Japanese administrative forms and procedures.

Answer questions in the user's language. Base your answers primarily on the following retrieved knowledge base context:

${contextText || "(no relevant context found)"}

If you are unsure or the answer is not in the context, say so and recommend consulting a licensed Gyoseishoshi (administrative scrivener). Never provide definitive legal advice — recommend the partner scrivener office for legal representation matters.`;
}
