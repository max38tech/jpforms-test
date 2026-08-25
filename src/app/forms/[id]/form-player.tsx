"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fieldLabel, type FormSchema, type Language } from "@/lib/types";

export default function FormPlayer({
  formId,
  title,
  schema,
}: {
  formId: string;
  title: string;
  schema: FormSchema;
}) {
  const [lang, setLang] = useState<Language>("en");
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_id: formId, form_data: values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
      setDownloadUrl(json.download_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (downloadUrl) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>✅ Your Japanese PDF is ready</CardTitle>
          <CardDescription>
            The filled official form has been generated. Download it below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              Download Completed PDF
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Select value={lang} onValueChange={(v) => setLang(v as Language)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
            <SelectItem value="vi">Tiếng Việt</SelectItem>
            <SelectItem value="zh">中文</SelectItem>
            <SelectItem value="ko">한국어</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Questionnaire</CardTitle>
          <CardDescription>
            Answers will be transferred onto the official Japanese form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schema.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This form has not been analyzed yet — no fields available.
            </p>
          )}
          {schema.fields.map((f) => {
            const id = `field-${f.pdf_field_id}`;
            return (
              <div key={f.pdf_field_id} className="space-y-1">
                <Label htmlFor={id}>
                  {fieldLabel(f, lang)}
                  {f.required && <span className="ml-1 text-red-500">*</span>}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={id}
                    value={values[f.pdf_field_id] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.pdf_field_id]: e.target.value }))
                    }
                  />
                ) : f.type === "select" ? (
                  <Select
                    value={values[f.pdf_field_id] ?? ""}
                    onValueChange={(v) => setValues((p) => ({ ...p, [f.pdf_field_id]: v }))}
                  >
                    <SelectTrigger id={id}><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={id}
                    type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                    required={f.required}
                    value={values[f.pdf_field_id] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.pdf_field_id]: e.target.value }))
                    }
                  />
                )}
              </div>
            );
          })}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Generating PDF…" : "Submit & Generate PDF"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
