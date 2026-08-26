import { NextResponse } from "next/server";
import { getLLMConfig } from "@/lib/llm/config";
import { retrieveContext, buildRagSystemPrompt } from "@/lib/rag";
import { streamChat } from "@/lib/llm/chat";
import { isValidLanguage } from "@/lib/language";
import type { Language } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, language: rawLanguage } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return NextResponse.json({ error: "messages required" }, { status: 400 });

    const language: Language = isValidLanguage(rawLanguage) ? rawLanguage : "en";

    const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    if (!lastUser) return NextResponse.json({ error: "no user message" }, { status: 400 });

    // RAG retrieval
    let systemPrompt: string;
    try {
      const context = await retrieveContext(lastUser.content);
      systemPrompt = await buildRagSystemPrompt(context, language);
    } catch {
      // Retrieval failed (e.g. no embeddings yet) — still use the branded,
      // language-aware prompt so responses stay in the right language and
      // reference the in-house scrivener either way.
      systemPrompt = await buildRagSystemPrompt([], language);
    }

    const config = await getLLMConfig();
    const stream = await streamChat(config, { systemPrompt, messages });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 }
    );
  }
}
