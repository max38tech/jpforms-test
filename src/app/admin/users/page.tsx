"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  created_at: string;
  page_balance: number;
  submissions: { total: number; completed: number };
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const json = await res.json();
      setUsers(json.users ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setRole(u: UserRow, role: "user" | "admin") {
    setBusyId(u.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Failed to update role"}`);
    } finally {
      setBusyId(null);
    }
  }

  async function grantPages(u: UserRow) {
    const amount = Number(grantAmount[u.id]);
    if (!amount) return;
    setBusyId(u.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, grant_pages: amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage(`✅ ${amount > 0 ? "Granted" : "Removed"} ${Math.abs(amount)} page credit(s) for ${u.email}`);
      setGrantAmount((p) => ({ ...p, [u.id]: "" }));
      await load();
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Failed to grant credits"}`);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Input
          placeholder="Search by email or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {message && <p className="text-sm">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>All Users ({filtered.length})</CardTitle>
          <CardDescription>
            Manage admin access and manually grant/remove page credits (e.g. for
            support cases, refunds, or promos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Page balance</TableHead>
                  <TableHead>Grant/remove pages</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => setRole(u, v as "user" | "admin")}
                        disabled={busyId === u.id}
                      >
                        <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.submissions.completed} completed / {u.submissions.total} total
                    </TableCell>
                    <TableCell className="text-sm font-medium">{u.page_balance}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="±pages"
                          className="w-24"
                          value={grantAmount[u.id] ?? ""}
                          onChange={(e) =>
                            setGrantAmount((p) => ({ ...p, [u.id]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => grantPages(u)}
                          disabled={busyId === u.id || !grantAmount[u.id]}
                        >
                          Apply
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
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
