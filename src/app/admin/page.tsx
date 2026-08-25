import Link from "next/link";

export default function AdminIndex() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Portal</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/forms" className="rounded-lg border p-6 hover:shadow-md">
          <h2 className="font-semibold">📋 Form Repository Manager</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload PDFs, run Gemini schema analysis, publish or hide forms.
          </p>
        </Link>
        <Link href="/admin/settings" className="rounded-lg border p-6 hover:shadow-md">
          <h2 className="font-semibold">⚙ System & LLM Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch the RAG chatbot LLM provider and manage API keys.
          </p>
        </Link>
      </div>
    </div>
  );
}
