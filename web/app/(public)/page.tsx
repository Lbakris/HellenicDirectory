import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-navy-700">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-navy-600">
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl text-gold">Hellenic Directory</span>
          <span className="text-gold-600 text-sm hidden sm:block">of America</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/parishes" className="text-cream/80 hover:text-cream text-sm transition-colors">
            Parishes
          </Link>
          <Link href="/businesses" className="text-cream/80 hover:text-cream text-sm transition-colors">
            Businesses
          </Link>
          <Link
            href="/login"
            className="bg-gold text-navy px-4 py-2 rounded text-sm font-medium hover:bg-gold-400 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="meander-divider mb-12" />
        <h1 className="font-serif text-5xl sm:text-6xl text-cream leading-tight mb-6">
          The Greek American
          <br />
          <span className="text-gold">Community Directory</span>
        </h1>
        <p className="text-cream/70 text-lg max-w-2xl mx-auto mb-12">
          Discover 540+ Greek Orthodox parishes, connect with your community, and find
          Greek-owned businesses across the United States and Canada.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/parishes"
            className="bg-gold text-navy px-8 py-3 rounded font-serif font-bold text-lg hover:bg-gold-400 transition-colors"
          >
            Find a Parish
          </Link>
          <Link
            href="/register"
            className="border border-gold/50 text-gold px-8 py-3 rounded font-serif text-lg hover:border-gold hover:text-gold-300 transition-colors"
          >
            Create Account
          </Link>
        </div>
        <div className="meander-divider mt-12" />
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        <FeatureCard
          title="Parish Directory"
          description="Search 540+ Greek Orthodox parishes by city, state, or clergy name. Get directions, contact info, and service times."
          icon="⛪"
          href="/parishes"
        />
        <FeatureCard
          title="Community"
          description="Stay connected with your Greek American and Greek Canadian community through private member directories."
          icon="🏛️"
          href="/register"
        />
        <FeatureCard
          title="Greek Businesses"
          description="Discover and support Greek-owned businesses across North America, searchable by category, city, and keyword."
          icon="🫒"
          href="/businesses"
        />
      </section>

      <footer className="border-t border-navy-600 py-8 text-center text-cream/40 text-sm">
        © {new Date().getFullYear()} Hellenic Directory of America. All rights reserved.
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-navy-600 border border-navy-500 rounded-lg p-6 hover:border-gold/40 transition-colors"
    >
      <div className="text-3xl mb-4">{icon}</div>
      <h2 className="font-serif text-cream text-xl mb-2 group-hover:text-gold transition-colors">{title}</h2>
      <p className="text-cream/60 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
