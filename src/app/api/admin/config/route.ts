import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getLLMConfig, saveLLMConfig, type LLMConfig } from "@/lib/llm/config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const config = await getLLMConfig();
  // Mask keys in response
  return NextResponse.json({
    provider: config.provider,
    apiKeys: Object.fromEntries(
      Object.entries(config.apiKeys).map(([k, v]) => [k, v ? "••••••••" + v.slice(-4) : ""])
    ),
  });
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = (await req.json()) as Partial<LLMConfig>;
    const current = await getLLMConfig();
    const next: LLMConfig = {
      provider: body.provider ?? current.provider,
      apiKeys: { ...current.apiKeys },
    };
    // Only overwrite keys that are provided unmasked
    for (const k of ["gemini", "openai", "anthropic"] as const) {
      const v = body.apiKeys?.[k];
      if (v && !v.startsWith("••")) next.apiKeys[k] = v;
    }
    await saveLLMConfig(next);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 }
    );
  }
}
