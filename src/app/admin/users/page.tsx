"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface InviteRow {
  email: string;
  role: "user" | "admin";
  consumed_at: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("admin");
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const [usersRes, invitesRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/invites"),
    ]);
    if (usersRes.ok) setUsers((await usersRes.json()).users ?? []);
    if (invitesRes.ok) setInvites((await invitesRes.json()).invites ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addUser() {
    if (!newEmail.trim()) return;
    setAdding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.applied === "immediately") {
        setMessage(`✅ ${newEmail} already had an account — role set to ${newRole} immediately.`);
      } else {
        setMessage(
          `✅ ${newEmail} will become ${newRole} the moment they sign in with Google for the first time.`
        );
      }
      setNewEmail("");
      await load();
    } catch (e) {
      setMessage(`❌ ${e instanceof Error ? e.message : "Failed to add user"}`);
    } finally {
      setAdding(false);
    }
  }

  async function removeInvite(email: string) {
    await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    load();
  }

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
  const pendingInvites = invites.filter((i) => !i.consumed_at);

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

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add User</CardTitle>
          <CardDescription>
            Accounts only exist once someone signs in with Google — there&apos;s
            no separate password to set. Add an email here to pre-authorize a
            role (e.g. give your partner scrivener admin access): if they&apos;ve
            already signed in, it applies immediately; if not, it applies the
            instant they first sign in with that Google account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <div className="grid gap-1">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="partner@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "user" | "admin")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addUser} disabled={adding || !newEmail.trim()}>
            {adding ? "Adding…" : "Add User"}
          </Button>
        </CardContent>
      </Card>

      {pendingInvites.length > 0 && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Pending Invites</CardTitle>
            <CardDescription>Applied automatically on first Google sign-in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((i) => (
              <div key={i.email} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>{i.email} → <span className="font-medium">{i.role}</span></span>
                <Button size="sm" variant="ghost" onClick={() => removeInvite(i.email)}>Cancel</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
