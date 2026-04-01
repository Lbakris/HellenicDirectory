/**
 * Terms of Service page.
 *
 * Note for legal review: This is a summary placeholder. Full Terms of Service
 * must be drafted by qualified legal counsel before launch.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Hellenic Directory of America",
  robots: { index: false },
};

const EFFECTIVE_DATE = "January 1, 2024";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="font-serif text-gold text-lg">
          ← Hellenic Directory of America
        </Link>

        <h1 className="font-serif text-navy text-3xl mt-8 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Effective Date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-slate max-w-none space-y-6 text-gray-700">
          <Section title="1. Acceptance of Terms">
            <p>
              By creating an account on Hellenic Directory of America, you agree to these Terms of
              Service. If you do not agree, you may not use the service.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 13 years of age to create an account. Users under 18 require
              parental or guardian consent. The service is an invite-only platform — account
              creation is subject to director approval.
            </p>
          </Section>

          <Section title="3. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide false or misleading information in your profile</li>
              <li>Harass, threaten, or abuse other members</li>
              <li>Use member contact information for commercial solicitation</li>
              <li>Scrape, harvest, or export member data</li>
              <li>Attempt to access accounts other than your own</li>
              <li>Upload malicious content or violate any applicable laws</li>
            </ul>
          </Section>

          <Section title="4. Directory Membership">
            <p>
              Directory membership is invite-only and subject to a dual-approval process.
              Membership may be revoked by directory administrators for violations of these
              terms or community standards.
            </p>
          </Section>

          <Section title="5. Business Listings">
            <p>
              Sponsored business listings are managed by platform administrators. Listing
              accuracy is the responsibility of the business owner. We reserve the right to
              remove listings that violate our content standards.
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              You retain ownership of content you post. By posting, you grant us a limited
              license to display your content to other verified members as part of the service.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              The service is provided &quot;as is&quot; without warranties of any kind. We are
              not liable for indirect, incidental, or consequential damages arising from your
              use of the platform.
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              You may delete your account at any time from your profile settings. We may suspend
              or terminate accounts that violate these terms.
            </p>
          </Section>

          <Section title="9. Changes to Terms">
            <p>
              We may update these terms. We will notify you of material changes by email at
              least 30 days before they take effect.
            </p>
          </Section>

          <Section title="10. Governing Law">
            <p>
              These terms are governed by the laws of the State of New York, without regard to
              conflict of law principles.
            </p>
          </Section>

          <p className="text-xs text-gray-400 mt-12 border-t pt-4">
            These Terms of Service were last reviewed on {EFFECTIVE_DATE}. This is a summary
            document — the complete legal text is available upon request.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-navy text-xl mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
