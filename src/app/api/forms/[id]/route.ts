import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: form, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !form)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const { data: schema } = await supabase
    .from("form_schemas")
    .select("schema_json")
    .eq("form_id", id)
    .single();

  return NextResponse.json({
    form,
    schema: schema?.schema_json ?? { fields: [] },
  });
}
