/**
 * Privacy Policy page.
 *
 * Note for legal review: This page contains a summary of data practices.
 * The full Privacy Policy document must be drafted by qualified legal counsel
 * to ensure compliance with CCPA/CPRA, all applicable US state privacy laws,
 * PIPEDA, and Quebec Law 25. Replace this placeholder content before launch.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Hellenic Directory of America",
  robots: { index: false }, // Do not index placeholder content
};

const EFFECTIVE_DATE = "January 1, 2024";
const CONTACT_EMAIL = "privacy@hellenicdir.com";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="font-serif text-gold text-lg">
          ← Hellenic Directory of America
        </Link>

        <h1 className="font-serif text-navy text-3xl mt-8 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Effective Date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-slate max-w-none space-y-6 text-gray-700">
          <Section title="1. Who We Are">
            <p>
              Hellenic Directory of America (&quot;we,&quot; &quot;our,&quot; or &quot;the
              Company&quot;) operates the Hellenic Directory platform, a private directory service
              connecting members of Greek Orthodox communities across North America.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following categories of personal information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Identity data:</strong> Full name, email address, phone number
              </li>
              <li>
                <strong>Account data:</strong> Password (stored as a one-way hash), account role
              </li>
              <li>
                <strong>Directory profile data:</strong> City, industry, employer, biography,
                profile photo, organization affiliations
              </li>
              <li>
                <strong>Usage data:</strong> Log files, IP addresses, browser type, page views
              </li>
              <li>
                <strong>Sensitive data:</strong> Greek Orthodox community affiliation, implied by
                directory membership (see Section 4)
              </li>
              <li>
                <strong>Consent records:</strong> Timestamps and version numbers for all consent
                acknowledgements
              </li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and manage your account</li>
              <li>To display your profile to other verified directory members</li>
              <li>To deliver in-app and forwarded messages</li>
              <li>To send transactional emails (account verification, invitations)</li>
              <li>To maintain security audit logs</li>
              <li>To comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="4. Sensitive Personal Information">
            <p>
              Membership in the Hellenic Directory implies Greek Orthodox community affiliation.
              This is classified as <strong>sensitive personal information</strong> under the
              California Consumer Privacy Act (CCPA/CPRA §1798.140(ae)(1)), the laws of 16 US
              states, the Personal Information Protection and Electronic Documents Act (PIPEDA
              Clause 4.3), and Quebec Law 25.
            </p>
            <p>
              We obtain your explicit consent to process this data at registration. You may
              withdraw consent at any time by requesting account deletion.
            </p>
          </Section>

          <Section title="5. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Access</strong> the personal data we hold about you
              </li>
              <li>
                <strong>Correct</strong> inaccurate personal data
              </li>
              <li>
                <strong>Delete</strong> your account and personal data (right to erasure)
              </li>
              <li>
                <strong>Opt out</strong> of sale of personal information (we do not sell personal
                data)
              </li>
              <li>
                <strong>Data portability:</strong> receive your data in a structured format
              </li>
              <li>
                <strong>Withdraw consent</strong> for sensitive data processing
              </li>
            </ul>
            <p>
              To exercise these rights, visit your profile settings or email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your account data for as long as your account is active. Upon account
              deletion, your data is soft-deleted immediately and permanently purged after a 30-day
              regulatory grace period, except where retention is required by law.
            </p>
          </Section>

          <Section title="7. Contact">
            <p>
              For privacy inquiries, contact our Privacy Officer at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <p className="text-xs text-gray-400 mt-12 border-t pt-4">
            This Privacy Policy was last reviewed on {EFFECTIVE_DATE}. This is a summary
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
