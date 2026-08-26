import { createServerComponentClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPageBalance } from "@/lib/billing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [{ data: submissions }, balance] = await Promise.all([
    admin
      .from("submissions")
      .select("*, forms(title_en)")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false }),
    getPageBalance(session.user.id).catch(() => 0),
  ]);

  const drafts = (submissions ?? []).filter((s) => s.status === "draft");
  const completedList = (submissions ?? []).filter((s) => s.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <div className="rounded-lg border px-4 py-2 text-sm">
          <span className="text-muted-foreground">Page credit balance: </span>
          <span className="font-semibold">{balance}</span>
        </div>
      </div>

      {drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Continue Where You Left Off</CardTitle>
            <CardDescription>Unfinished forms — your answers are saved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm">{s.forms?.title_en ?? "Untitled form"}</span>
                <Button size="sm" asChild>
                  <a href={`/forms/${s.form_id}/wizard?submission=${s.id}`}>Resume</a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Submission History</CardTitle>
        </CardHeader>
        <CardContent>
          {completedList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed submissions yet.</p>
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
                {completedList.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.forms?.title_en ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(s.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="capitalize">
                      {s.paid_at ? "Paid" : "Awaiting payment"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/submissions/${s.id}`}>
                          {s.paid_at ? "Download PDF" : "View & Pay"}
                        </a>
                      </Button>
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
