import Stripe from "stripe";

let cached: Stripe | null = null;

/** Lazily constructs the Stripe client. Throws with a clear message if the
 *  secret key isn't configured, rather than failing deep inside a route. */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set it in Vercel env vars to enable payments."
    );
  }
  // No explicit apiVersion: uses the account's default pinned API version
  // (set in the Stripe dashboard), which avoids type drift when the SDK
  // is upgraded independently of the pinned version.
  cached = new Stripe(key);
  return cached;
}
