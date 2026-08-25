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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORIES } from "@/lib/types";

interface FormRow {
  id: string;
  title_ja: string;
  title_en: string;
  category: string;
  is_active: boolean;
}

export default function AdminForms() {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [category, setCategory] = useState("immigration");
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const res = await fetch("/api/admin/forms");
    if (res.ok) {
      const json = await res.json();
      setForms(json.forms ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function upload() {
    if (!file || !titleEn || !titleJa) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      fd.append("title_en", titleEn);
      fd.append("title_ja", titleJa);
      fd.append("category", category);
      const res = await fetch("/api/admin/forms", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage("✅ Form uploaded");
      setTitleEn(""); setTitleJa(""); setFile(null);
      load();
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Upload failed"}`);
    } finally {
      setUploading(false);
    }
  }

  async function parse(formId: string) {
    setParsingId(formId);
    setMessage(null);
    try {
      const res = await fetch("/api/forms/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_id: formId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage("✅ Schema generated with Gemini");
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Parsing failed"}`);
    } finally {
      setParsingId(null);
    }
  }

  async function toggleActive(f: FormRow) {
    await fetch("/api/admin/forms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, is_active: !f.is_active }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Form Repository Manager</h1>

      <Card>
        <CardHeader><CardTitle>Upload New Form PDF</CardTitle></CardHeader>
        <CardContent className="grid max-w-xl gap-3">
          <div className="grid gap-1">
            <Label htmlFor="ten">Title (English)</Label>
            <Input id="ten" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="tja">Title (Japanese)</Label>
            <Input id="tja" value={titleJa} onChange={(e) => setTitleJa(e.target.value)} />
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
            <Label htmlFor="pdf">Official PDF</Label>
            <Input
              id="pdf"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button onClick={upload} disabled={uploading || !file}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </CardContent>
      </Card>

      {message && <p className="text-sm">{message}</p>}

      <Card>
        <CardHeader><CardTitle>Existing Forms</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.title_en}<br /><span className="text-xs text-muted-foreground">{f.title_ja}</span></TableCell>
                  <TableCell>{f.category}</TableCell>
                  <TableCell>{f.is_active ? "Active" : "Hidden"}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => parse(f.id)} disabled={parsingId === f.id}>
                      {parsingId === f.id ? "Analyzing…" : "Analyze with Gemini"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(f)}>
                      {f.is_active ? "Hide" : "Publish"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
