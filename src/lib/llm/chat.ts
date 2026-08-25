import type { LLMConfig } from "@/lib/llm/config";

export interface StreamOptions {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

const encoder = new TextEncoder();

/**
 * Streams a chat completion from the currently active LLM provider.
 * Returns a ReadableStream of plain text chunks.
 *
 * The "custom" provider speaks the OpenAI Chat Completions protocol, so it
 * works with any OpenAI-compatible endpoint: Groq, Together, DeepInfra,
 * Fireworks, OpenRouter, vLLM, Ollama, LM Studio, etc.
 */
export async function streamChat(
  config: LLMConfig,
  opts: StreamOptions
): Promise<ReadableStream<Uint8Array>> {
  // ---- Custom OpenAI-compatible provider (open-source / self-hosted) ----
  if (config.provider === "custom") {
    const baseUrl = config.custom?.baseUrl;
    const model = config.custom?.model || "openai/gpt-oss-120b";
    const apiKey = config.apiKeys.custom;

    if (!baseUrl) throw new Error("Custom LLM base URL is not configured");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    else if (baseUrl.includes("api.groq.com") || baseUrl.includes(":11434")) {
      // Groq requires a key; Ollama doesn't. Leave header absent otherwise.
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "system", content: opts.systemPrompt }, ...opts.messages],
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Custom LLM error ${res.status}: ${await res.text().catch(() => "")}`);
    }

    return parseSSE(res.body);
  }

  // ---- OpenAI ----
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

  // ---- Anthropic ----
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

  // ---- Gemini (default) ----
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

/** Parses a Server-Sent Events body into a plain-text chunk stream (OpenAI format). */
function parseSSE(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      for (;;) {
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
              return;
            }
          } catch {
            // partial JSON — wait for more data
          }
        }
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
      }
    },
  });
}
