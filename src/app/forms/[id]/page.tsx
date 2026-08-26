import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateDraft } from "@/lib/submissions";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FormLandingPage({
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
  const schema = (schemaRec?.schema_json as FormSchema) ?? { fields: [] };

  const current = await getCurrentUser();

  // Signed in: skip the login gate, jump straight into (or resume) the wizard.
  if (current) {
    const draft = await getOrCreateDraft(current.user.id, id);
    redirect(`/forms/${id}/wizard?submission=${draft.id}`);
  }

  // Signed out: explain the form + why we require Google sign-in before
  // starting the questionnaire.
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{form.title_en}</h1>
        <p className="text-muted-foreground">{form.title_ja}</p>
      </div>

      {form.description && <p className="text-sm">{form.description}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Sign in to start this form</CardTitle>
          <CardDescription>
            {schema.fields.length} question{schema.fields.length === 1 ? "" : "s"} ·
            {" "}~{Math.max(1, Math.round(schema.fields.length / 4))} min
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            We ask you to sign in with your Google account before starting so that:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Your progress is saved automatically — leave and come back anytime without losing answers.</li>
            <li>Your completed forms are kept in your Dashboard for re-download later.</li>
            <li>We can securely verify who you are without asking you to create and remember another password.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use Google Sign-In because it&apos;s a secure, industry-standard way to
            authenticate you — it keeps your data protected without us ever seeing
            or storing your Google password. We respect your privacy: we will never
            send you spam, and we do not sell or share your personal information.
            See our{" "}
            <a href="/privacy" className="underline">Privacy Policy</a> for details
            on how your data is handled under Japan&apos;s APPI.
          </p>
          <Button asChild className="w-full">
            <a href={`/login?next=/forms/${id}`}>Continue with Google</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
