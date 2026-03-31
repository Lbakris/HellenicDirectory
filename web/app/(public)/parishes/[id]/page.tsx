import type { Metadata } from "next";
import Link from "next/link";
import type { Parish } from "../../../../shared/src/types/parish";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getParish(id: string): Promise<Parish | null> {
  try {
    const res = await fetch(`${API_URL}/parishes/${id}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const parish = await getParish(params.id);
  if (!parish) return { title: "Parish Not Found" };
  return {
    title: `${parish.name} | Hellenic Directory`,
    description: `${parish.name} — ${parish.city}, ${parish.state}. Greek Orthodox parish.`,
  };
}

export default async function ParishDetailPage({ params }: { params: { id: string } }) {
  const parish = await getParish(params.id);

  if (!parish) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Parish not found.</p>
        <Link href="/parishes" className="text-gold mt-4 inline-block hover:underline">← Back to parishes</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/parishes" className="text-gold/80 hover:text-gold text-sm flex items-center gap-1 mb-6">
          ← Back to Parish Directory
        </Link>

        <h1 className="font-serif text-4xl text-navy mb-1">{parish.name}</h1>
        {parish.metropolis && (
          <p className="text-muted-foreground text-sm mb-4">{parish.metropolis.name}</p>
        )}
        <div className="meander-divider my-6" />

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {/* Contact */}
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-serif text-lg text-navy mb-3">Contact Information</h2>
            {parish.address && <InfoRow label="Address" value={parish.address} />}
            {parish.city && (
              <InfoRow label="Location" value={`${parish.city}${parish.state ? ", " + parish.state : ""}${parish.zip ? " " + parish.zip : ""}`} />
            )}
            {parish.phone && (
              <InfoRow label="Phone" value={<a href={`tel:${parish.phone}`} className="text-gold hover:underline">{parish.phone}</a>} />
            )}
            {parish.email && (
              <InfoRow label="Email" value={<a href={`mailto:${parish.email}`} className="text-gold hover:underline">{parish.email}</a>} />
            )}
            {parish.website && (
              <InfoRow label="Website" value={<a href={parish.website} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Visit Website</a>} />
            )}
          </div>

          {/* Clergy */}
          {parish.clergy && parish.clergy.length > 0 && (
            <div className="bg-card border rounded-lg p-5">
              <h2 className="font-serif text-lg text-navy mb-3">Clergy</h2>
              <ul className="space-y-3">
                {parish.clergy.map((c) => (
                  <li key={c.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy shrink-0">
                      {c.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy">{c.title ? `${c.title} ${c.fullName}` : c.fullName}</p>
                      {c.email && <a href={`mailto:${c.email}`} className="text-xs text-gold hover:underline">{c.email}</a>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm mb-2">
      <span className="text-muted-foreground min-w-[72px]">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
