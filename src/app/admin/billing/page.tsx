"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminBilling() {
  const [pricePerPageJpy, setPricePerPageJpy] = useState("500");
  const [subscriptionPriceJpy, setSubscriptionPriceJpy] = useState("2500");
  const [subscriptionPages, setSubscriptionPages] = useState("30");
  const [subscriptionDays, setSubscriptionDays] = useState("7");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/billing")
      .then((r) => r.json())
      .then((json) => {
        const c = json.config;
        if (!c) return;
        setPricePerPageJpy(String(c.pricePerPageJpy));
        setSubscriptionPriceJpy(String(c.subscriptionPriceJpy));
        setSubscriptionPages(String(c.subscriptionPages));
        setSubscriptionDays(String(c.subscriptionDays));
      });
    fetch("/api/admin/billing/status")
      .then((r) => r.json())
      .then((json) => setStripeConfigured(json.configured))
      .catch(() => setStripeConfigured(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricePerPageJpy: Number(pricePerPageJpy),
          subscriptionPriceJpy: Number(subscriptionPriceJpy),
          subscriptionPages: Number(subscriptionPages),
          subscriptionDays: Number(subscriptionDays),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage("✅ Pricing saved — applies immediately, no redeploy needed");
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing & Pricing</h1>

      {stripeConfigured === false && (
        <Card className="max-w-xl border-amber-300 bg-amber-50/50">
          <CardContent className="pt-6 text-sm leading-relaxed">
            ⚠️ Stripe is not fully configured yet. Set{" "}
            <code className="rounded bg-secondary px-1">STRIPE_SECRET_KEY</code>,{" "}
            <code className="rounded bg-secondary px-1">STRIPE_WEBHOOK_SECRET</code>, and{" "}
            <code className="rounded bg-secondary px-1">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
            in Vercel env vars, and register a webhook endpoint in the Stripe
            dashboard pointing at{" "}
            <code className="rounded bg-secondary px-1">/api/billing/webhook</code>{" "}
            listening for <code className="rounded bg-secondary px-1">checkout.session.completed</code>,{" "}
            <code className="rounded bg-secondary px-1">invoice.paid</code>, and{" "}
            <code className="rounded bg-secondary px-1">customer.subscription.deleted</code>.
            Until then, checkout will fail with a clear error instead of silently
            not charging anyone.
          </CardContent>
        </Card>
      )}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            Applies to every form download going forward. Existing paid
            downloads are unaffected.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <Label htmlFor="ppp">Price per page (one-time), JPY</Label>
            <Input id="ppp" type="number" min={0} value={pricePerPageJpy} onChange={(e) => setPricePerPageJpy(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="sp">Subscription price, JPY</Label>
            <Input id="sp" type="number" min={0} value={subscriptionPriceJpy} onChange={(e) => setSubscriptionPriceJpy(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="spg">Subscription pages included</Label>
            <Input id="spg" type="number" min={1} value={subscriptionPages} onChange={(e) => setSubscriptionPages(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="spd">Subscription period, days</Label>
            <Input id="spd" type="number" min={1} value={subscriptionDays} onChange={(e) => setSubscriptionDays(e.target.value)} />
          </div>
          {message && <p className="text-sm">{message}</p>}
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Pricing"}</Button>
        </CardContent>
      </Card>

      <Card className="max-w-xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base">How page pricing works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          Each form has a &quot;page count&quot; (set in Form Manager) — the number of
          printed A4 pages it produces. A one-time purchase for an N-page form costs
          N × price-per-page. The subscription grants a pool of pages that renews
          weekly via Stripe and is consumed across any forms until it runs out or
          expires (whichever comes first).
        </CardContent>
      </Card>
    </div>
  );
}
