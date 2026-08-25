"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { SiteContent } from "@/lib/site-content";

const FIELDS: {
  key: keyof SiteContent;
  label: string;
  multiline?: boolean;
  tab: "homepage" | "scrivener" | "legal";
}[] = [
  { key: "homepage_hero_title", label: "Homepage hero title", tab: "homepage" },
  { key: "homepage_hero_body", label: "Homepage hero body", multiline: true, tab: "homepage" },
  { key: "about_body", label: "About page intro", multiline: true, tab: "homepage" },
  { key: "footer_disclaimer", label: "Footer disclaimer", multiline: true, tab: "homepage" },
  { key: "scrivener_partner_name", label: "Partner scrivener full name", tab: "scrivener" },
  { key: "scrivener_office_name", label: "Partner office name", tab: "scrivener" },
  { key: "scrivener_registration_number", label: "Registration number", tab: "scrivener" },
  { key: "scrivener_office_address", label: "Office address", tab: "scrivener" },
  { key: "scrivener_office_contact", label: "Office contact (phone/email)", tab: "scrivener" },
  {
    key: "scrivener_notice_body",
    label: "Legal Scrivener Advisory notice text",
    multiline: true,
    tab: "legal",
  },
];

export default function AdminContent() {
  const [content, setContent] = useState<Partial<SiteContent>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((json) => setContent(json.content ?? {}));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage("✅ Site content saved — live immediately, no redeploy needed");
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  function renderField(f: (typeof FIELDS)[number]) {
    return (
      <div key={f.key} className="grid gap-1">
        <Label htmlFor={f.key}>{f.label}</Label>
        {f.multiline ? (
          <Textarea
            id={f.key}
            rows={f.key === "scrivener_notice_body" ? 10 : 4}
            value={content[f.key] ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, [f.key]: e.target.value }))}
          />
        ) : (
          <Input
            id={f.key}
            value={content[f.key] ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, [f.key]: e.target.value }))}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Site Content</h1>
      <p className="text-sm text-muted-foreground">
        Edit user-facing text without a redeploy. Changes save to the database and
        appear immediately on the live site.
      </p>

      <Tabs defaultValue="scrivener" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="homepage">Homepage / Footer</TabsTrigger>
          <TabsTrigger value="scrivener">Scrivener Details</TabsTrigger>
          <TabsTrigger value="legal">Legal Advisory Notice</TabsTrigger>
        </TabsList>
        <TabsContent value="homepage">
          <Card>
            <CardHeader><CardTitle>Homepage & Footer</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {FIELDS.filter((f) => f.tab === "homepage").map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="scrivener">
          <Card>
            <CardHeader>
              <CardTitle>Partner Scrivener Details</CardTitle>
              <CardDescription>
                Shown on the /legal-scrivener page, required disclosure under the
                Administrative Scrivener Act.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {FIELDS.filter((f) => f.tab === "scrivener").map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>Legal Scrivener Advisory Notice</CardTitle>
              <CardDescription>
                The full disclosure text shown on /legal-scrivener. Have your
                partner scrivener review this text before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {FIELDS.filter((f) => f.tab === "legal").map(renderField)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {message && <p className="text-sm">{message}</p>}
      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save All Content"}
      </Button>
    </div>
  );
}
