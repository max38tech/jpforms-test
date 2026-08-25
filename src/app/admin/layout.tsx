import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();

  if (!current || current.role !== "admin") {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area requires administrator privileges.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b pb-3 text-sm">
        <Link href="/admin/forms" className="hover:underline">Form Manager</Link>
        <Link href="/admin/settings" className="hover:underline">System & LLM Settings</Link>
        <Link href="/admin/content" className="hover:underline">Site Content</Link>
      </nav>
      {children}
    </div>
  );
}
