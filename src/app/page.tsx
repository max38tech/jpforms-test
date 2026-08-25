const features = [
  {
    title: "🌐 Multi-language Questionnaires",
    body: "Official Japanese forms translated into English, Vietnamese, Chinese, and Korean.",
  },
  {
    title: "📄 Automated PDF Filling",
    body: "Your answers are transferred onto the official Japanese PDF with accurate Japanese text rendering.",
  },
  {
    title: "🤖 AI Support Chatbot",
    body: "Ask about visas, ward office procedures, and required documents — powered by RAG over verified guides.",
  },
  {
    title: "⚖ Licensed Scrivener Network",
    body: "Complex legal matters are referred to our licensed Gyoseishoshi / Shiho-shoshi partner firm.",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Japanese Administrative Forms, In Your Language
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Translate, complete, and download official Japanese government forms —
          immigration, ward office, tax, labor, and business.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/forms" className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground">
            Browse Form Library
          </a>
          <a href="/login" className="rounded-md border px-5 py-2.5 font-medium">
            Sign in
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
