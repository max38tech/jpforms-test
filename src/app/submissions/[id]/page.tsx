import { createServerComponentClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PaymentPanel from "@/app/forms/[id]/wizard/payment-panel";

export const dynamic = "force-dynamic";

/**
 * Landing page after Stripe checkout redirects back (success or cancel).
 * Reuses the same PaymentPanel used at the end of the wizard — it always
 * re-checks entitlement server-side via /api/submissions/[id]/download
 * rather than trusting the ?payment=success query param, since Stripe
 * webhooks may complete slightly after the redirect.
 */
export default async function SubmissionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const admin = createAdminClient();
  const { data: submission } = await admin
    .from("submissions")
    .select("*, forms(title_en, title_ja, page_count)")
    .eq("id", id)
    .single();

  if (!submission || submission.user_id !== session.user.id) redirect("/dashboard");

  return (
    <PaymentPanel
      submissionId={submission.id}
      formTitle={`${submission.forms?.title_en ?? "Form"}（${submission.forms?.title_ja ?? ""}）`}
      pageCount={submission.forms?.page_count ?? 1}
    />
  );
}
