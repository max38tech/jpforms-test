"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Doc {
  id: string;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "company_info", label: "Company Info (about us, pricing, policies)" },
  { value: "form_guide", label: "Form Guide (forms we DON'T auto-fill, general info)" },
  { value: "visa_procedure", label: "Visa / Immigration Procedure" },
  { value: "ward_office_procedure", label: "Ward Office Procedure" },
  { value: "tax_labor", label: "Tax / Labor" },
  { value: "faq", label: "General FAQ" },
];

const ACCEPTED_TYPES =
  "application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.md,text/plain,image/png,image/jpeg,image/jpg,image/webp";

export default function AdminKnowledgeBase() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("company_info");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractWarning, setExtractWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/admin/knowledge-base");
    if (res.ok) {
      const json = await res.json();
      setDocs(json.documents ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setTitle("");
    setContent("");
    setCategory("company_info");
    setEditingId(null);
    setExtractWarning(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function editDoc(d: Doc) {
    setEditingId(d.id);
    setTitle(d.title);
    setContent(d.content);
    setCategory(d.category ?? "company_info");
    setExtractWarning(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtractWarning(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/knowledge-base/extract", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      // Append rather than overwrite, so uploading multiple files (e.g. a
      // form instructions PDF + a follow-up image) builds one document.
      setContent((prev) => (prev ? `${prev}\n\n${json.text}` : json.text));
      if (!title && json.suggestedTitle) setTitle(json.suggestedTitle);
      if (json.warning) setExtractWarning(json.warning);
      setMessage(`✅ Extracted text from ${file.name} (${json.method}) — review below before saving.`);
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : "Extraction failed"}`);
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save() {
    if (!title || !content) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        editingId ? `/api/admin/knowledge-base/${editingId}` : "/api/admin/knowledge-base",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, category }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage(editingId ? "✅ Document updated" : "✅ Document added to knowledge base");
      resetForm();
      load();
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document from the knowledge base?")) return;
    await fetch(`/api/admin/knowledge-base/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Knowledge Base (RAG)</h1>
      <p className="text-sm text-muted-foreground">
        Documents here are embedded and retrieved by the support chatbot to answer
        user questions. Add company info (who you are, the partner scrivener,
        pricing, refund policy), and guides for forms/procedures you don&apos;t
        auto-fill but customers ask about (e.g. sole proprietorship registration,
        specific visa types). Without content here, the chatbot has nothing to
        ground its answers in and will either hallucinate or punt to Google.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Document" : "Add Document"}</CardTitle>
          <CardDescription>
            Write clearly and specifically — the chatbot quotes this content
            directly. One document per topic works better than one giant document.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-2xl gap-3">
          <div className="grid gap-1">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Sole Proprietorship Registration (開業届) — Where to File"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="upload">Upload a document (optional)</Label>
            <Input
              id="upload"
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileUpload}
              disabled={extracting}
            />
            <p className="text-xs text-muted-foreground">
              PDF, Word (.docx), text (.txt/.md), or image (JPG/PNG/WebP) — e.g. the
              instruction sheet that comes with an official government form.
              Extracted text is appended into the Content box below for you to
              review and clean up before saving. Scanned PDFs and images are read
              via AI OCR automatically.
            </p>
            {extracting && <p className="text-sm text-muted-foreground">Extracting text…</p>}
            {extractWarning && (
              <p className="text-sm text-amber-700">⚠️ {extractWarning}</p>
            )}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              rows={14}
              placeholder="Write the full answer/info here in plain language, or upload a document above to extract it automatically. E.g. company details, or: 'Sole proprietorship registration (開業届, kaigyō todoke) is filed with the local tax office, not something we currently auto-fill. Customers should visit the National Tax Agency site or ask our partner scrivener for assistance filing it.'"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          {message && <p className="text-sm">{message}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !title || !content}>
              {saving ? "Saving…" : editingId ? "Update Document" : "Add to Knowledge Base"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>Cancel edit</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Documents ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents yet. Add your first one above — start with company info
              and your top 5-10 most common customer questions.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.category ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {d.content}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editDoc(d)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(d.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
