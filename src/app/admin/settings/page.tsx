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
  { value: "gemini", label: "Gemini" },
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

const GEMINI_CHAT_MODEL_PRESETS = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-2.5-pro"];
const GEMINI_SCHEMA_MODEL_PRESETS = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-2.5-pro"];
const GEMINI_EMBEDDING_MODEL_PRESETS = ["gemini-embedding-001"];

const SCHEMA_CUSTOM_PRESETS = [
  {
    label: "Qwen3.7-Flash (QwenCloud/DashScope)",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    model: "qwen3.7-flash",
  },
  {
    label: "Qwen-VL-Max (higher accuracy)",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    model: "qwen-vl-max",
  },
  {
    label: "OpenAI GPT-4o-mini (vision)",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  {
    label: "OpenRouter (any vision model)",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "qwen/qwen-vl-max",
  },
];

function PresetChips({
  presets,
  onPick,
}: {
  presets: string[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((p) => (
        <Button key={p} type="button" size="sm" variant="outline" onClick={() => onPick(p)}>
          {p}
        </Button>
      ))}
    </div>
  );
}

export default function AdminSettings() {
  const [provider, setProvider] = useState("gemini");
  const [chatModel, setChatModel] = useState("gemini-2.5-flash");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");

  const [schemaProvider, setSchemaProvider] = useState<"gemini" | "custom">("gemini");
  const [schemaModel, setSchemaModel] = useState("gemini-2.5-flash");
  const [schemaCustomBaseUrl, setSchemaCustomBaseUrl] = useState("");
  const [schemaCustomModel, setSchemaCustomModel] = useState("");
  const [schemaCustomKey, setSchemaCustomKey] = useState("");

  const [embeddingModel, setEmbeddingModel] = useState("gemini-embedding-001");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((json) => {
        if (json.provider) setProvider(json.provider);
        if (json.chatModel) setChatModel(json.chatModel);
        if (json.apiKeys) setKeys(json.apiKeys);
        if (json.custom) {
          setBaseUrl(json.custom.baseUrl ?? "");
          setModel(json.custom.model ?? "");
        }
        if (json.schemaProvider) setSchemaProvider(json.schemaProvider);
        if (json.schemaModel) setSchemaModel(json.schemaModel);
        if (json.schemaCustom) {
          setSchemaCustomBaseUrl(json.schemaCustom.baseUrl ?? "");
          setSchemaCustomModel(json.schemaCustom.model ?? "");
          setSchemaCustomKey(json.schemaCustom.apiKey ?? "");
        }
        if (json.embeddingModel) setEmbeddingModel(json.embeddingModel);
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
          chatModel,
          apiKeys: keys,
          custom: { baseUrl, model },
          schemaProvider,
          schemaModel,
          schemaCustom: {
            baseUrl: schemaCustomBaseUrl,
            model: schemaCustomModel,
            apiKey: schemaCustomKey,
          },
          embeddingModel,
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

      <Card className="max-w-xl border-amber-300 bg-amber-50/50">
        <CardContent className="pt-6 text-sm leading-relaxed">
          Google periodically retires Gemini model ids (e.g.{" "}
          <code className="rounded bg-secondary px-1">gemini-2.0-flash</code> and{" "}
          <code className="rounded bg-secondary px-1">text-embedding-004</code> were
          both shut down). Model fields below are free-text on purpose — if chat or
          extraction suddenly starts erroring with a 404 &quot;model not found&quot;,
          just type in the replacement model id here, no redeploy required.
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>PDF Schema Extraction Model</CardTitle>
          <CardDescription>
            Used by the &quot;Analyze with Gemini&quot; button in Form Manager. Needs a
            vision-capable model (it reads the PDF as an image). Independent of the
            chatbot provider below — pick whatever gives the best accuracy/cost for
            reading and translating Japanese forms.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <Label>Extraction provider</Label>
            <Select value={schemaProvider} onValueChange={(v) => setSchemaProvider(v as "gemini" | "custom")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="custom">Custom / Open-Source (OpenAI-compatible vision)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {schemaProvider === "gemini" && (
            <>
              <div className="grid gap-1">
                <Label htmlFor="schema-gemini-model">Gemini model id</Label>
                <Input
                  id="schema-gemini-model"
                  placeholder="gemini-2.5-flash"
                  value={schemaModel}
                  onChange={(e) => setSchemaModel(e.target.value)}
                />
                <PresetChips presets={GEMINI_SCHEMA_MODEL_PRESETS} onPick={setSchemaModel} />
              </div>
              <p className="text-xs text-muted-foreground">
                Uses the Gemini API Key from the chatbot section below (or, if
                empty, the server&apos;s{" "}
                <code className="rounded bg-secondary px-1">GOOGLE_GENERATIVE_AI_API_KEY</code>).
              </p>
            </>
          )}

          {schemaProvider === "custom" && (
            <>
              <div className="grid gap-1">
                <Label htmlFor="schema-baseurl">Base URL (OpenAI-compatible vision endpoint)</Label>
                <Input
                  id="schema-baseurl"
                  placeholder="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
                  value={schemaCustomBaseUrl}
                  onChange={(e) => setSchemaCustomBaseUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label>Quick presets</Label>
                <div className="flex flex-wrap gap-2">
                  {SCHEMA_CUSTOM_PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSchemaCustomBaseUrl(p.baseUrl);
                        setSchemaCustomModel(p.model);
                      }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="schema-model">Model ID</Label>
                <Input
                  id="schema-model"
                  placeholder="qwen3.7-flash"
                  value={schemaCustomModel}
                  onChange={(e) => setSchemaCustomModel(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="schema-key">API Key</Label>
                <Input
                  id="schema-key"
                  type="password"
                  placeholder={schemaCustomKey || "Required for most hosted providers"}
                  value={schemaCustomKey.startsWith("••") ? "" : schemaCustomKey}
                  onChange={(e) => setSchemaCustomKey(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                For QwenCloud/DashScope, get a key at{" "}
                <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="underline">
                  dashscope.console.aliyun.com
                </a>{" "}
                — set{" "}
                <code className="rounded bg-secondary px-1">DASHSCOPE_API_KEY</code>{" "}
                as your API key here. Requires the endpoint to accept an inline
                base64 PDF as a &quot;file&quot; content part in chat completions;
                if a provider doesn&apos;t support that shape, extraction will
                return a clear error and you can switch back to Gemini.
              </p>
            </>
          )}

          {message && <p className="text-sm">{message}</p>}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Configuration"}
          </Button>
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

          {provider === "gemini" && (
            <div className="grid gap-1">
              <Label htmlFor="chat-gemini-model">Gemini model id</Label>
              <Input
                id="chat-gemini-model"
                placeholder="gemini-2.5-flash"
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
              />
              <PresetChips presets={GEMINI_CHAT_MODEL_PRESETS} onPick={setChatModel} />
            </div>
          )}

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

          {/* Gemini key needed for schema extraction/embeddings above even if chat uses another provider */}
          {provider !== "gemini" && (
            <div className="grid gap-1">
              <Label htmlFor="key-gemini-schema">
                Gemini API Key (for PDF schema extraction / embeddings above)
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

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Knowledge Base Embedding Model</CardTitle>
          <CardDescription>
            Used to embed knowledge-base articles and chat queries for RAG
            retrieval (cosine search via pgvector). Always Gemini&apos;s embedding
            API, regardless of chat/schema provider — uses the same Gemini API
            Key as above.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <Label htmlFor="embedding-model">Embedding model id</Label>
            <Input
              id="embedding-model"
              placeholder="gemini-embedding-001"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
            />
            <PresetChips presets={GEMINI_EMBEDDING_MODEL_PRESETS} onPick={setEmbeddingModel} />
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ If you change this, existing embeddings in{" "}
            <code className="rounded bg-secondary px-1">knowledge_base</code> were
            generated with the old model and should be regenerated for consistent
            similarity search results.
          </p>
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
          For the chatbot: Groq (free tier, fast Llama 3.3 70B), Together AI, or
          DeepInfra are cheap and solid. For PDF schema extraction, Qwen3.7-Flash
          via QwenCloud/DashScope is a newer, cheaper vision option worth testing
          against Gemini for both field-reading accuracy and translation quality —
          switch providers above and re-run &quot;Analyze&quot; on the same form to
          compare results side by side.
        </CardContent>
      </Card>
    </div>
  );
}
