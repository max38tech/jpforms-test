"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVIDERS = [
  { value: "gemini", label: "Gemini 2.0 Flash" },
  { value: "openai", label: "OpenAI GPT-4o-mini" },
  { value: "anthropic", label: "Anthropic Claude 3.5 Haiku" },
  { value: "custom", label: "Custom / Open-Source (OpenAI-compatible)" },
];

const CUSTOM_PRESETS = [
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { label: "Together AI", baseUrl: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { label: "DeepInfra", baseUrl: "https://api.deepinfra.com/v1/openai", model: "Qwen/Qwen2.5-72B-Instruct" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "deepseek/deepseek-chat" },
  { label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
];

const SCHEMA_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (default, fast & cheap)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (highest accuracy, slower/pricier)" },
];

export default function AdminSettings() {
  const [provider, setProvider] = useState("gemini");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [schemaModel, setSchemaModel] = useState("gemini-2.0-flash");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((json) => {
        if (json.provider) setProvider(json.provider);
        if (json.apiKeys) setKeys(json.apiKeys);
        if (json.custom) {
          setBaseUrl(json.custom.baseUrl ?? "");
          setModel(json.custom.model ?? "");
        }
        if (json.schemaModel) setSchemaModel(json.schemaModel);
      });
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKeys: keys,
          custom: { baseUrl, model },
          schemaModel,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage("✅ Configuration saved — applies immediately, no redeploy needed");
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System & LLM Settings</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>PDF Schema Extraction Model</CardTitle>
          <CardDescription>
            Used by the &quot;Analyze with Gemini&quot; button in Form Manager. Always
            a Gemini model, since it requires native PDF vision input — the chatbot
            provider below (including Custom/open-source) can&apos;t read PDFs directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <Label>Schema extraction model</Label>
            <Select value={schemaModel} onValueChange={setSchemaModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHEMA_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Uses the Gemini API Key below (or, if that field is empty, the
            server&apos;s <code className="rounded bg-secondary px-1">GOOGLE_GENERATIVE_AI_API_KEY</code>{" "}
            environment variable).
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>RAG Chatbot Provider</CardTitle>
          <CardDescription>
            The active provider is used by the support chatbot immediately — no redeploy.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <Label>Active LLM</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider === "custom" && (
            <>
              <div className="grid gap-1">
                <Label htmlFor="baseurl">Base URL (OpenAI-compatible endpoint)</Label>
                <Input
                  id="baseurl"
                  placeholder="https://api.groq.com/openai/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label>Quick presets</Label>
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBaseUrl(p.baseUrl);
                        setModel(p.model);
                      }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="cmodel">Model ID</Label>
                <Input
                  id="cmodel"
                  placeholder="llama-3.3-70b-versatile"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </>
          )}

          {(provider === "gemini" || provider === "openai" || provider === "anthropic") &&
            (
              ([["gemini", "Gemini API Key"], ["openai", "OpenAI API Key"], ["anthropic", "Anthropic API Key"]] as const)
                .filter(([k]) => k === provider)
                .map(([k, label]) => (
                  <div key={k} className="grid gap-1">
                    <Label htmlFor={`key-${k}`}>{label}</Label>
                    <Input
                      id={`key-${k}`}
                      type="password"
                      placeholder={keys[k] || "Not configured"}
                      value={keys[k]?.startsWith("••") ? "" : keys[k] ?? ""}
                      onChange={(e) => setKeys((prev) => ({ ...prev, [k]: e.target.value }))}
                    />
                  </div>
                ))
            )}

          {provider === "custom" && (
            <div className="grid gap-1">
              <Label htmlFor="key-custom">API Key (leave empty for local/no-auth endpoints)</Label>
              <Input
                id="key-custom"
                type="password"
                placeholder={keys["custom"] || "Optional"}
                value={keys["custom"]?.startsWith("••") ? "" : keys["custom"] ?? ""}
                onChange={(e) => setKeys((prev) => ({ ...prev, custom: e.target.value }))}
              />
            </div>
          )}

          {/* Always show the Gemini key field too when it's not the primary chat
              provider, since the schema extractor above needs it regardless. */}
          {provider !== "gemini" && (
            <div className="grid gap-1">
              <Label htmlFor="key-gemini-schema">
                Gemini API Key (for PDF schema extraction above)
              </Label>
              <Input
                id="key-gemini-schema"
                type="password"
                placeholder={keys["gemini"] || "Not configured"}
                value={keys["gemini"]?.startsWith("••") ? "" : keys["gemini"] ?? ""}
                onChange={(e) => setKeys((prev) => ({ ...prev, gemini: e.target.value }))}
              />
            </div>
          )}

          {message && <p className="text-sm">{message}</p>}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>

      <Card className="max-w-xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base">💡 Open-source model tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          The &quot;Custom&quot; provider works with any OpenAI-compatible API. Cheapest
          quality options for a chatbot workload are Groq (free tier, very fast
          Llama 3.3 70B), Together AI, or DeepInfra (~$0.10–0.90 per M tokens).
          Self-hosting via Ollama or vLLM is also supported — just expose the
          /v1 endpoint. Note: form schema extraction always uses Gemini (see the
          card above), since it requires native PDF vision input that most
          open-source text endpoints don&apos;t support.
        </CardContent>
      </Card>
    </div>
  );
}
