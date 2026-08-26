import { NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getBillingConfig } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Creates a Stripe Checkout session for either a one-time page purchase or
 * the weekly subscription. `pages` is only used for the one-time flow (it
 * determines the charge: pricePerPageJpy * pages). Redirects back to the
 * submission's review page on success/cancel so the user resumes the
 * download flow right where they left off.
 */
export async function POST(req: Request) {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user)
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const { mode, pages, submission_id } = await req.json();
    if (mode !== "one_time" && mode !== "subscription")
      return NextResponse.json({ error: "mode must be 'one_time' or 'subscription'" }, { status: 400 });

    const billing = await getBillingConfig();
    const stripe = getStripe();
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
    const returnPath = submission_id ? `/submissions/${submission_id}` : "/dashboard";

    if (mode === "one_time") {
      const pageCount = Math.max(1, Number(pages) || 1);
      const amount = billing.pricePerPageJpy * pageCount;

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: session.user.email ?? undefined,
        client_reference_id: session.user.id,
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: {
                name: `Form download (${pageCount} page${pageCount > 1 ? "s" : ""})`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          user_id: session.user.id,
          type: "one_time",
          pages: String(pageCount),
          submission_id: submission_id ?? "",
        },
        success_url: `${origin}${returnPath}?payment=success`,
        cancel_url: `${origin}${returnPath}?payment=cancelled`,
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    // Subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.user.email ?? undefined,
      client_reference_id: session.user.id,
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `Weekly plan — ${billing.subscriptionPages} pages / ${billing.subscriptionDays} days`,
            },
            unit_amount: billing.subscriptionPriceJpy,
            recurring: { interval: "week" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: session.user.id,
        type: "subscription",
        pages: String(billing.subscriptionPages),
        submission_id: submission_id ?? "",
      },
      success_url: `${origin}${returnPath}?payment=success`,
      cancel_url: `${origin}${returnPath}?payment=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
