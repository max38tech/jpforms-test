import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export default async function FormsCatalog() {
  const supabase = createAdminClient();
  const { data: forms } = await supabase
    .from("forms")
    .select("id, title_en, title_ja, category, description")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Form Library</h1>
        <p className="text-muted-foreground">
          Official Japanese administrative forms with translated questionnaires.
        </p>
      </div>

      {!forms || forms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No forms published yet. Admins can upload forms in the{" "}
          <Link href="/admin/forms" className="underline">Admin Portal</Link>.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <Link key={f.id} href={`/forms/${f.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{f.title_en}</CardTitle>
                  <CardDescription>{f.title_ja}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs">
                    {CATEGORY_LABELS[f.category] ?? f.category}
                  </span>
                  {f.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {f.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
