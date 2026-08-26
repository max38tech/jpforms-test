import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { getBillingConfig } from "@/lib/billing";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Must be registered in the Stripe dashboard pointing at
 * <site>/api/billing/webhook, listening for:
 *   checkout.session.completed
 *   invoice.paid (subscription renewals)
 *   customer.subscription.deleted
 * STRIPE_WEBHOOK_SECRET must be set to the signing secret shown when you
 * create the webhook endpoint in the Stripe dashboard.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const userId = cs.metadata?.user_id;
        const type = cs.metadata?.type as "one_time" | "subscription" | undefined;
        const pages = Number(cs.metadata?.pages || 0);
        const submissionId = cs.metadata?.submission_id || null;
        if (!userId || !type || !pages) break;

        const { data: payment, error: payErr } = await supabase
          .from("payments")
          .insert({
            user_id: userId,
            type,
            stripe_session_id: cs.id,
            stripe_payment_intent_id:
              typeof cs.payment_intent === "string" ? cs.payment_intent : null,
            stripe_subscription_id:
              typeof cs.subscription === "string" ? cs.subscription : null,
            amount_jpy: cs.amount_total ?? 0,
            pages_granted: pages,
            status: "completed",
            submission_id: submissionId,
          })
          .select()
          .single();
        if (payErr) throw new Error(payErr.message);

        const billing = await getBillingConfig();
        const expiresAt =
          type === "subscription"
            ? new Date(Date.now() + billing.subscriptionDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        const { error: creditErr } = await supabase.from("page_credits").insert({
          user_id: userId,
          delta: pages,
          reason: type === "subscription" ? "purchase_subscription" : "purchase_one_time",
          payment_id: payment.id,
          submission_id: submissionId,
          expires_at: expiresAt,
        });
        if (creditErr) throw new Error(creditErr.message);

        if (type === "subscription" && typeof cs.subscription === "string") {
          await supabase.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_subscription_id: cs.subscription,
              stripe_customer_id:
                typeof cs.customer === "string" ? cs.customer : String(cs.customer ?? ""),
              status: "active",
              current_period_end: expiresAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" }
          );
        }
        break;
      }

      case "invoice.paid": {
        // Weekly subscription renewal — grant another period's worth of pages.
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
        if (!subId) break;
        // Skip the very first invoice — checkout.session.completed already
        // granted the initial period's credits for a fresh subscription.
        if (invoice.billing_reason === "subscription_create") break;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subId)
          .single();
        if (!sub) break;

        const billing = await getBillingConfig();
        const expiresAt = new Date(
          Date.now() + billing.subscriptionDays * 24 * 60 * 60 * 1000
        ).toISOString();

        await supabase.from("page_credits").insert({
          user_id: sub.user_id,
          delta: billing.subscriptionPages,
          reason: "purchase_subscription",
          expires_at: expiresAt,
        });
        await supabase
          .from("subscriptions")
          .update({ current_period_end: expiresAt, status: "active", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      default:
        break;
    }
  } catch (e) {
    // Log and 500 so Stripe retries — but signature was already verified,
    // so this is safe to retry.
    console.error("Stripe webhook handler error:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
