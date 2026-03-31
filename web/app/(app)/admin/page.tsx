import { requireSession } from "../../../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminPage() {
  const { user, accessToken } = await requireSession();
  if (user.appRole === "REGISTERED") redirect("/dashboard");

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const statsRes = await fetch(`${API_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const { stats } = statsRes.ok ? await statsRes.json() : { stats: null };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl text-navy mb-2">Admin Dashboard</h1>
      <div className="meander-divider my-6" />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
          {[
            { label: "Users", value: stats.users },
            { label: "Parishes", value: stats.parishes },
            { label: "Directories", value: stats.directories },
            { label: "Businesses", value: stats.businesses },
            { label: "Messages", value: stats.messages },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="font-serif text-2xl text-navy">{value.toLocaleString()}</p>
              <p className="text-muted-foreground text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <AdminCard href="/admin/users" title="Manage Users" desc="View and update user roles" />
        <AdminCard href="/admin/directories" title="Directories" desc="Create and manage private directories" />
        <AdminCard href="/admin/businesses" title="Business Listings" desc="Add and manage sponsored listings" />
      </div>
    </div>
  );
}

function AdminCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="group bg-card border border-border rounded-lg p-5 hover:border-gold/40 transition-colors">
      <h2 className="font-serif text-navy text-lg group-hover:text-gold transition-colors mb-1">{title}</h2>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </Link>
  );
}
