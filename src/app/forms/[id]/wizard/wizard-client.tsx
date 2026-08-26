"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fieldLabel, type FormSchema, type Language } from "@/lib/types";
import PaymentPanel from "./payment-panel";

interface Props {
  formId: string;
  formTitle: string;
  schema: FormSchema;
  submissionId: string;
  initialData: Record<string, string>;
  initialStep: number;
  alreadyCompleted: boolean;
  pageCount: number;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function WizardClient({
  formId,
  formTitle,
  schema,
  submissionId,
  initialData,
  initialStep,
  alreadyCompleted,
  pageCount,
}: Props) {
  const router = useRouter();
  const fields = schema.fields;
  const total = fields.length;

  const [lang, setLang] = useState<Language>("en");
  const [values, setValues] = useState<Record<string, string>>(initialData);
  const [step, setStep] = useState(Math.min(initialStep, Math.max(total - 1, 0)));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentField = fields[step];
  const progressPct = total > 0 ? Math.round(((step + (completed ? 1 : 0)) / total) * 100) : 0;

  const persist = useCallback(
    async (newValues: Record<string, string>, newStep: number) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/submissions/${submissionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form_data: newValues, current_step: newStep }),
        });
        if (!res.ok) throw new Error();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [submissionId]
  );

  // Debounced autosave whenever the answer changes.
  function updateValue(fieldId: string, value: string) {
    const next = { ...values, [fieldId]: value };
    setValues(next);
    setSaveState("saving");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => persist(next, step), 600);
  }

  function goNext() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    const nextStep = Math.min(step + 1, total - 1);
    setStep(nextStep);
    persist(values, nextStep);
  }

  function goBack() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    const prevStep = Math.max(step - 1, 0);
    setStep(prevStep);
    persist(values, prevStep);
  }

  async function saveAndExit() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    await persist(values, step);
    router.push("/dashboard");
  }

  async function finish() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, form_id: formId, form_data: values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
      setCompleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setGenerating(false);
    }
  }

  // Warn on tab close if there's an unsaved change in flight.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  if (total === 0) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Form not ready yet</CardTitle>
          <CardDescription>
            This form hasn&apos;t been analyzed by an admin yet — no questions available.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (completed) {
    return (
      <PaymentPanel
        submissionId={submissionId}
        formTitle={formTitle}
        pageCount={pageCount}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{formTitle}</h1>
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

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {step + 1} of {total}</span>
          <span>
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "✓ Progress saved"}
            {saveState === "error" && "⚠ Save failed — check connection"}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{fieldLabel(currentField, lang)}</CardTitle>
          {/* Show the plain-English/Japanese explanation of what's being
              asked, using both label languages as context since schemas
              don't currently carry a separate "help text" field. */}
          <CardDescription>
            {lang !== "ja" && currentField.label_ja && (
              <span className="block">日本語: {currentField.label_ja}</span>
            )}
            {currentField.required && (
              <span className="mt-1 block text-amber-700">This field is required.</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentField.type === "textarea" ? (
            <Textarea
              autoFocus
              value={values[currentField.pdf_field_id] ?? ""}
              onChange={(e) => updateValue(currentField.pdf_field_id, e.target.value)}
              rows={5}
            />
          ) : currentField.type === "select" ? (
            <Select
              value={values[currentField.pdf_field_id] ?? ""}
              onValueChange={(v) => updateValue(currentField.pdf_field_id, v)}
            >
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {(currentField.options ?? []).map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              autoFocus
              type={
                currentField.type === "date"
                  ? "date"
                  : currentField.type === "number"
                  ? "number"
                  : "text"
              }
              value={values[currentField.pdf_field_id] ?? ""}
              onChange={(e) => updateValue(currentField.pdf_field_id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (step < total - 1) goNext();
                }
              }}
            />
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={saveAndExit}>
              Save & exit
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={goBack}>Back</Button>
              )}
              {step < total - 1 ? (
                <Button onClick={goNext}>Next</Button>
              ) : (
                <Button onClick={finish} disabled={generating}>
                  {generating ? "Generating PDF…" : "Finish & Generate PDF"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
