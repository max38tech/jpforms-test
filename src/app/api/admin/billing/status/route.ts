import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const configured = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
  );
  return NextResponse.json({ configured });
}
