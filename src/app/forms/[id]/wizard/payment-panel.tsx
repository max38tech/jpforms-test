"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Pricing {
  pricePerPageJpy: number;
  oneTimeTotalJpy: number;
  subscriptionPriceJpy: number;
  subscriptionPages: number;
  subscriptionDays: number;
}

type PhaseState =
  | { phase: "loading" }
  | { phase: "ready"; downloadUrl: string }
  | { phase: "payment_required"; pricing: Pricing }
  | { phase: "error"; message: string };

export default function PaymentPanel({
  submissionId,
  formTitle,
  pageCount,
}: {
  submissionId: string;
  formTitle: string;
  pageCount: number;
}) {
  const [state, setState] = useState<PhaseState>({ phase: "loading" });
  const [checkingOut, setCheckingOut] = useState<"one_time" | "subscription" | null>(null);

  async function checkDownload(retriesLeft = 0) {
    setState({ phase: "loading" });
    try {
      const res = await fetch(`/api/submissions/${submissionId}/download`);
      const json = await res.json();
      if (res.status === 402) {
        if (retriesLeft > 0) {
          // Just returned from Stripe checkout — the webhook may take a
          // moment to land. Retry a few times before showing the paywall.
          await new Promise((r) => setTimeout(r, 1500));
          return checkDownload(retriesLeft - 1);
        }
        setState({ phase: "payment_required", pricing: json.pricing });
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to prepare download");
      setState({ phase: "ready", downloadUrl: json.download_url });
    } catch (e) {
      setState({ phase: "error", message: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justPaid = params.get("payment") === "success";
    checkDownload(justPaid ? 4 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  async function checkout(mode: "one_time" | "subscription") {
    setCheckingOut(mode);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, pages: pageCount, submission_id: submissionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Failed to start checkout");
      window.location.href = json.url;
    } catch (e) {
      setState({ phase: "error", message: e instanceof Error ? e.message : "Checkout failed" });
      setCheckingOut(null);
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>✅ {formTitle} is complete</CardTitle>
        <CardDescription>
          {pageCount} printed page{pageCount > 1 ? "s" : ""} (A4)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.phase === "loading" && (
          <p className="text-sm text-muted-foreground">Checking your account…</p>
        )}

        {state.phase === "error" && (
          <p className="text-sm text-red-500">{state.message}</p>
        )}

        {state.phase === "ready" && (
          <>
            <p className="text-sm text-muted-foreground">
              Your Japanese PDF is ready to download.
            </p>
            <Button asChild className="w-full">
              <a href={state.downloadUrl} target="_blank" rel="noopener noreferrer">
                Download Completed PDF
              </a>
            </Button>
          </>
        )}

        {state.phase === "payment_required" && (
          <>
            <p className="text-sm text-muted-foreground">
              This form is {pageCount} page{pageCount > 1 ? "s" : ""}. Choose how
              you&apos;d like to pay to download it:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="font-semibold">One-time</p>
                <p className="text-2xl font-bold">
                  ¥{state.pricing.oneTimeTotalJpy.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  ¥{state.pricing.pricePerPageJpy}/page × {pageCount} page{pageCount > 1 ? "s" : ""}
                </p>
                <Button
                  className="mt-3 w-full"
                  onClick={() => checkout("one_time")}
                  disabled={checkingOut !== null}
                >
                  {checkingOut === "one_time" ? "Redirecting…" : "Pay once"}
                </Button>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-semibold">Weekly plan</p>
                <p className="text-2xl font-bold">
                  ¥{state.pricing.subscriptionPriceJpy.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {state.pricing.subscriptionPages} pages over {state.pricing.subscriptionDays} days,
                  renews weekly
                </p>
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={() => checkout("subscription")}
                  disabled={checkingOut !== null}
                >
                  {checkingOut === "subscription" ? "Redirecting…" : "Subscribe"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              After payment you&apos;ll be brought right back here to download —
              your form data isn&apos;t lost.
            </p>
          </>
        )}

        <div className="flex gap-2 border-t pt-4">
          <Button variant="ghost" asChild className="flex-1">
            <a href="/forms">Fill another form</a>
          </Button>
          <Button variant="ghost" asChild className="flex-1">
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
