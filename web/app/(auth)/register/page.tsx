"use client";

/**
 * Registration page — collects user details and explicit consent acknowledgements.
 *
 * Compliance: Three consent checkboxes are required before account creation:
 *  1. Privacy Policy (CCPA, all 20 US state privacy laws, PIPEDA)
 *  2. Terms of Service
 *  3. Sensitive data processing consent for Greek Orthodox community affiliation
 *     data (required in 16 US states, Canada under PIPEDA Clause 4.3, and
 *     Quebec Law 25 §12)
 *
 * The `privacyPolicyVersion` field is sent to the backend so the exact version
 * the user accepted is recorded in the audit trail.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api-client";

/** Version of the Privacy Policy currently in effect. Update when policy changes. */
const PRIVACY_POLICY_VERSION = "2024-01-01";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [consents, setConsents] = useState({
    privacyPolicy: false,
    terms: false,
    sensitiveData: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function updateConsent(key: keyof typeof consents) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setConsents((c) => ({ ...c, [key]: e.target.checked }));
  }

  const allConsented = consents.privacyPolicy && consents.terms && consents.sensitiveData;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allConsented) {
      setError("You must accept all required agreements to create an account.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", {
        ...form,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        consentPrivacyPolicy: true,
        consentTerms: true,
        consentSensitiveData: true,
      });
      router.push("/login?registered=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-700 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-2xl text-gold">
            Hellenic Directory
          </Link>
          <p className="text-cream/60 text-sm mt-1">of America</p>
        </div>

        <div className="bg-navy-600 border border-navy-500 rounded-lg p-8">
          <h1 className="font-serif text-2xl text-cream mb-6">Create Account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              id="fullName"
              label="Full Name"
              type="text"
              value={form.fullName}
              onChange={updateField("fullName")}
              autoComplete="name"
              required
            />
            <Field
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={updateField("email")}
              autoComplete="email"
              required
            />
            <Field
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={updateField("password")}
              autoComplete="new-password"
              required
            />
            <Field
              id="phone"
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={updateField("phone")}
              autoComplete="tel"
            />

            {/* ── Consent acknowledgements (required by law) ──────────────── */}
            <div className="border-t border-navy-500 pt-4 space-y-3">
              <p className="text-cream/50 text-xs">Required agreements</p>

              <ConsentCheckbox
                id="consent-privacy"
                checked={consents.privacyPolicy}
                onChange={updateConsent("privacyPolicy")}
                required
              >
                I have read and agree to the{" "}
                <Link href="/privacy" target="_blank" className="text-gold underline">
                  Privacy Policy
                </Link>
              </ConsentCheckbox>

              <ConsentCheckbox
                id="consent-terms"
                checked={consents.terms}
                onChange={updateConsent("terms")}
                required
              >
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-gold underline">
                  Terms of Service
                </Link>
              </ConsentCheckbox>

              <ConsentCheckbox
                id="consent-sensitive"
                checked={consents.sensitiveData}
                onChange={updateConsent("sensitiveData")}
                required
              >
                I consent to the processing of my Greek Orthodox community
                affiliation data as described in the Privacy Policy. This data
                is treated as sensitive personal information under applicable
                privacy laws.
              </ConsentCheckbox>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !allConsented}
              className="w-full bg-gold text-navy py-2 rounded font-medium hover:bg-gold-400 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-cream/50 text-sm text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-gold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-cream/70 text-sm mb-1" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        className="w-full bg-navy-700 border border-navy-500 rounded px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold"
      />
    </div>
  );
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  required,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        required={required}
        className="mt-0.5 accent-gold shrink-0"
      />
      <span className="text-cream/70 text-xs leading-relaxed">{children}</span>
    </label>
  );
}
