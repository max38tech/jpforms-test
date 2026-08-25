import { createServerComponentClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) redirect("/login");

  const admin = createAdminClient();
  const { data: submissions } = await admin
    .from("submissions")
    .select("*, forms(title_en)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  // Signed URLs for each output PDF (1 hour)
  const rows = await Promise.all(
    (submissions ?? []).map(async (s) => {
      let url: string | null = null;
      if (s.output_pdf_path) {
        const { data } = await admin.storage
          .from("pdf-templates")
          .createSignedUrl(s.output_pdf_path, 3600);
        url = data?.signedUrl ?? null;
      }
      return { ...s, url };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Submission History</CardTitle>
        </CardHeader>
        <CardContent>
          {!rows || rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Title</TableHead>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.forms?.title_en ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(s.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="capitalize">{s.status}</TableCell>
                    <TableCell>
                      {s.url ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={s.url} target="_blank" rel="noopener noreferrer">
                            Download PDF
                          </a>
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
