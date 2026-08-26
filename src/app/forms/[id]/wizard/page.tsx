import { createAdminClient, createServerComponentClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WizardClient from "./wizard-client";
import type { FormSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submission?: string }>;
}) {
  const { id } = await params;
  const { submission: submissionId } = await searchParams;

  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect(`/forms/${id}`);

  const admin = createAdminClient();

  const { data: form } = await admin
    .from("forms")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();
  if (!form) return <p className="text-center text-muted-foreground">Form not found.</p>;

  const { data: schemaRec } = await admin
    .from("form_schemas")
    .select("schema_json")
    .eq("form_id", id)
    .single();
  const schema = (schemaRec?.schema_json as FormSchema) ?? { fields: [] };

  let submission = null;
  if (submissionId) {
    const { data } = await admin
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("user_id", session.user.id)
      .single();
    submission = data;
  }
  if (!submission) redirect(`/forms/${id}`);

  return (
    <WizardClient
      formId={id}
      formTitle={`${form.title_en}（${form.title_ja}）`}
      schema={schema}
      submissionId={submission.id}
      initialData={submission.form_data ?? {}}
      initialStep={submission.current_step ?? 0}
      alreadyCompleted={submission.status === "completed"}
      pageCount={form.page_count ?? 1}
    />
  );
}
