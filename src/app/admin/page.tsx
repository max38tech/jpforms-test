import Link from "next/link";

export default function AdminIndex() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Portal</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/forms" className="rounded-lg border p-6 hover:shadow-md">
          <h2 className="font-semibold">📋 Form Repository Manager</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload PDFs, run Gemini schema analysis, publish or hide forms.
          </p>
        </Link>
        <Link href="/admin/knowledge-base" className="rounded-lg border p-6 hover:shadow-md">
          <h2 className="font-semibold">📚 Knowledge Base</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add company info and form/procedure guides for the support chatbot.
          </p>
        </Link>
        <Link href="/admin/users" className="rounded-lg border p-6 hover:shadow-md">
          <h2 className="font-semibold">👤 Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage admin access, view activity, grant page credits.
          </p>
        </Link>
        <Link href="/admin/billing" className="rounded-lg border p-6 hover:shadow-md">
          <h2 className="font-semibold">💳 Billing & Pricing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set per-page pricing and subscription plan details for Stripe checkout.
          </p>
        </Link>
        <Link href="/admin/settings" className="rounded-lg border p-6 hover:shadow-md">
          <h2 className="font-semibold">⚙ System & LLM Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch the RAG chatbot LLM provider and manage API keys.
          </p>
        </Link>
        <Link href="/admin/content" className="rounded-lg border p-6 hover:shadow-md">
          <h2 className="font-semibold">📝 Site Content</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit homepage text, footer, and the Legal Scrivener Advisory notice.
          </p>
        </Link>
      </div>
    </div>
  );
}
