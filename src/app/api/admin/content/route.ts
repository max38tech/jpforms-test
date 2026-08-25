import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSiteContent, saveSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const content = await getSiteContent();
  return NextResponse.json({ content });
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = await req.json();
    await saveSiteContent(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 }
    );
  }
}
