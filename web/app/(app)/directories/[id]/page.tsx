import { requireSession } from "../../../../lib/auth";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default async function DirectoryPage({ params }: { params: { id: string } }) {
  const { accessToken } = await requireSession();

  const [dirRes, membersRes] = await Promise.all([
    fetch(`${API_URL}/directories/${params.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
    fetch(`${API_URL}/directories/${params.id}/members?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
  ]);

  if (!dirRes.ok) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Directory not found or access denied.</p>
        <Link href="/dashboard" className="text-gold mt-4 inline-block hover:underline">← Dashboard</Link>
      </div>
    );
  }

  const { directory } = await dirRes.json();
  const membersData = membersRes.ok ? await membersRes.json() : { data: [] };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/dashboard" className="text-gold/80 hover:text-gold text-sm mb-6 inline-block">← Dashboard</Link>

      <div className="flex items-start justify-between mb-2">
        <h1 className="font-serif text-3xl text-navy">{directory.name}</h1>
        <Link href={`/directories/${params.id}/messages`}
          className="bg-gold text-navy px-4 py-2 rounded text-sm font-medium hover:bg-gold-400 transition-colors">
          Inbox
        </Link>
      </div>
      {directory.description && <p className="text-muted-foreground mb-4">{directory.description}</p>}
      <div className="meander-divider my-6" />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl text-navy">Members ({membersData.meta?.total ?? membersData.data.length})</h2>
        <Link href={`/directories/${params.id}/invite`}
          className="border border-gold/50 text-gold text-sm px-4 py-2 rounded hover:border-gold transition-colors">
          + Invite
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {membersData.data.map((member: any) => (
          <div key={member.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt={member.user.fullName} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold">
                  {member.user.fullName.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-medium text-navy text-sm">{member.user.fullName}</p>
                {member.city && <p className="text-muted-foreground text-xs">{member.city}</p>}
              </div>
            </div>
            {member.industry && <p className="text-xs text-muted-foreground">{member.industry}{member.employer ? ` · ${member.employer}` : ""}</p>}
            {member.organizations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {member.organizations.slice(0, 3).map((mo: any) => (
                  <span key={mo.id} className="bg-gold/10 text-gold-700 border border-gold/20 rounded-full px-2 py-0.5 text-xs">
                    {mo.organization.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
