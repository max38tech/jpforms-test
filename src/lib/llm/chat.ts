import type { LLMConfig } from "@/lib/llm/config";

export interface StreamOptions {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

/**
 * Streams a chat completion from the currently active LLM provider.
 * Returns a ReadableStream of plain text chunks (for Vercel AI SDK-free streaming).
 */
export async function streamChat(
  config: LLMConfig,
  opts: StreamOptions
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  if (config.provider === "openai" && config.apiKeys.openai) {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: config.apiKeys.openai });
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: opts.systemPrompt },
        ...opts.messages,
      ],
    });
    return new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      },
    });
  }

  if (config.provider === "anthropic" && config.apiKeys.anthropic) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: config.apiKeys.anthropic });
    const stream = client.messages.stream({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      system: opts.systemPrompt,
      messages: opts.messages,
    });
    return new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });
  }

  // Default: Gemini
  const apiKey = config.apiKeys.gemini || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("No Gemini API key configured");

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContentStream({
    model: "gemini-2.0-flash",
    contents,
    config: { systemInstruction: opts.systemPrompt },
  });

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
      }
      controller.close();
    },
  });
}
