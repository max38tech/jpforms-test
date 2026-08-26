import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { extractDocumentText } from "@/lib/document-extract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    if (file.size > 20 * 1024 * 1024)
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractDocumentText(buffer, file.type, file.name);

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to extract document text" },
      { status: 500 }
    );
  }
}
