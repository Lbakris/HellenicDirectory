import { requireSession } from "../../../lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const { user } = await requireSession();

  const isAdmin = user.appRole === "OWNER" || user.appRole === "ADMIN";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl text-navy mb-2">
        Welcome, {user.fullName.split(" ")[0]}
      </h1>
      <div className="meander-divider my-6" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashCard href="/parishes" title="Parish Directory" desc="Search Greek Orthodox parishes" icon="⛪" />
        <DashCard href="/businesses" title="Business Directory" desc="Find Greek-owned businesses" icon="🫒" />
        <DashCard href="/profile" title="My Profile" desc="Update your information" icon="👤" />
        {isAdmin && (
          <>
            <DashCard href="/admin" title="Admin Dashboard" desc="Manage users, directories & listings" icon="⚙️" />
          </>
        )}
      </div>
    </div>
  );
}

function DashCard({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: string }) {
  return (
    <Link href={href} className="group bg-card border border-border rounded-lg p-5 hover:border-gold/40 transition-colors">
      <div className="text-2xl mb-3">{icon}</div>
      <h2 className="font-serif text-navy text-lg group-hover:text-gold transition-colors mb-1">{title}</h2>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </Link>
  );
}
