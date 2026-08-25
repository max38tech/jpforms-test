import { createAdminClient } from "@/lib/supabase/server";
import FormPlayer from "./form-player";
import type { FormSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: form } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!form) {
    return <p className="text-center text-muted-foreground">Form not found.</p>;
  }

  const { data: schemaRec } = await supabase
    .from("form_schemas")
    .select("schema_json")
    .eq("form_id", id)
    .single();

  return (
    <FormPlayer
      formId={id}
      title={`${form.title_en}（${form.title_ja}）`}
      schema={(schemaRec?.schema_json as FormSchema) ?? { fields: [] }}
    />
  );
}
