"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
];

export default function AdminSettings() {
  const [provider, setProvider] = useState("gemini");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((json) => {
        if (json.provider) setProvider(json.provider);
        if (json.apiKeys) setKeys(json.apiKeys);
      });
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKeys: keys }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage("✅ Configuration saved — chatbot provider updated live");
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
          <CardTitle>RAG Chatbot Provider</CardTitle>
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

          {(["gemini", "openai", "anthropic"] as const).map((k) => (
            <div key={k} className="grid gap-1">
              <Label htmlFor={`key-${k}`}>
                {k === "gemini" ? "Gemini API Key" : k === "openai" ? "OpenAI API Key" : "Anthropic API Key"}
              </Label>
              <Input
                id={`key-${k}`}
                type="password"
                placeholder={keys[k] || "Not configured"}
                value={keys[k]?.startsWith("••") ? "" : keys[k] ?? ""}
                onChange={(e) => setKeys((prev) => ({ ...prev, [k]: e.target.value }))}
              />
            </div>
          ))}

          {message && <p className="text-sm">{message}</p>}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
