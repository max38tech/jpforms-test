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
      Object.entries(config.apiKeys ?? {}).map(([k, v]) => [k, v ? "••••••••" + v.slice(-4) : ""])
    ),
    custom: config.custom ?? null,
    schemaProvider: config.schemaProvider ?? "gemini",
    schemaModel: config.schemaModel ?? "gemini-2.0-flash",
    schemaCustom: config.schemaCustom
      ? {
          baseUrl: config.schemaCustom.baseUrl,
          model: config.schemaCustom.model,
          apiKey: config.schemaCustom.apiKey
            ? "••••••••" + config.schemaCustom.apiKey.slice(-4)
            : "",
        }
      : null,
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
      custom: { ...(current.custom ?? { baseUrl: "", model: "" }) },
      schemaProvider: body.schemaProvider ?? current.schemaProvider,
      schemaModel: body.schemaModel ?? current.schemaModel,
      schemaCustom: {
        ...(current.schemaCustom ?? { baseUrl: "", model: "" }),
      },
    };
    // Only overwrite keys that are provided unmasked
    for (const k of ["gemini", "openai", "anthropic", "custom"] as const) {
      const v = body.apiKeys?.[k];
      if (v && !v.startsWith("••")) next.apiKeys[k] = v;
    }
    if (body.custom?.baseUrl !== undefined) next.custom!.baseUrl = body.custom.baseUrl;
    if (body.custom?.model !== undefined) next.custom!.model = body.custom.model;

    if (body.schemaCustom?.baseUrl !== undefined)
      next.schemaCustom!.baseUrl = body.schemaCustom.baseUrl;
    if (body.schemaCustom?.model !== undefined)
      next.schemaCustom!.model = body.schemaCustom.model;
    if (body.schemaCustom?.apiKey && !body.schemaCustom.apiKey.startsWith("••"))
      next.schemaCustom!.apiKey = body.schemaCustom.apiKey;

    await saveLLMConfig(next);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 }
    );
  }
}
