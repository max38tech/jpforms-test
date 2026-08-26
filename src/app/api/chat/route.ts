import { NextResponse } from "next/server";
import { getLLMConfig } from "@/lib/llm/config";
import { retrieveContext, buildRagSystemPrompt } from "@/lib/rag";
import { streamChat } from "@/lib/llm/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return NextResponse.json({ error: "messages required" }, { status: 400 });

    const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    if (!lastUser) return NextResponse.json({ error: "no user message" }, { status: 400 });

    // RAG retrieval
    let systemPrompt: string;
    try {
      const context = await retrieveContext(lastUser.content);
      systemPrompt = await buildRagSystemPrompt(context);
    } catch {
      // Retrieval failed (e.g. no embeddings yet) — still use the branded
      // prompt so the scrivener-partner framing is consistent either way.
      systemPrompt = await buildRagSystemPrompt([]);
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
