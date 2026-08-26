import { NextResponse } from "next/server";
import { createServerComponentClient, createAdminClient } from "@/lib/supabase/server";
import { consumePageCredits, getBillingConfig } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Payment-gated download. Behavior:
 *  - If this submission was already paid for (paid_at set), just re-issue a
 *    fresh signed URL — no double-charge for re-downloading.
 *  - Otherwise, check the user's page-credit balance (from one-time
 *    purchases or an active subscription). If sufficient, atomically
 *    consume the credits, mark paid_at, and return the signed URL.
 *  - If insufficient, return 402 with the price/required pages so the
 *    frontend can render the Stripe checkout options.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: submission } = await admin
    .from("submissions")
    .select("*, forms(page_count, title_en, title_ja)")
    .eq("id", id)
    .single();
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  if (submission.user_id !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (submission.status !== "completed" || !submission.output_pdf_path)
    return NextResponse.json({ error: "This form has not been completed yet." }, { status: 409 });

  const pageCount: number = submission.forms?.page_count ?? 1;

  if (!submission.paid_at) {
    const result = await consumePageCredits(session.user.id, pageCount, id);
    if (!result.ok) {
      const billing = await getBillingConfig();
      return NextResponse.json(
        {
          error: "payment_required",
          balance: result.balance,
          required: result.required,
          pricing: {
            pricePerPageJpy: billing.pricePerPageJpy,
            oneTimeTotalJpy: billing.pricePerPageJpy * pageCount,
            subscriptionPriceJpy: billing.subscriptionPriceJpy,
            subscriptionPages: billing.subscriptionPages,
            subscriptionDays: billing.subscriptionDays,
          },
        },
        { status: 402 }
      );
    }
    await admin
      .from("submissions")
      .update({ paid_at: new Date().toISOString() })
      .eq("id", id);
  }

  const { data: signed, error: signErr } = await admin.storage
    .from("pdf-templates")
    .createSignedUrl(submission.output_pdf_path, 3600);
  if (signErr || !signed)
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });

  return NextResponse.json({ ok: true, download_url: signed.signedUrl });
}
