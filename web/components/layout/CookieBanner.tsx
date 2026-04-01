"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "hd_cookie_consent";
const CONSENT_VERSION = "2024-01-01";

/**
 * Cookie consent banner required by CCPA, PIPEDA, and Quebec Law 25.
 *
 * Renders a fixed bottom banner on the user's first visit. Once accepted or
 * declined, the choice is persisted in localStorage so the banner is not
 * shown again. The version is stored alongside the decision so a new policy
 * revision can prompt users to re-consent.
 *
 * CCPA / Quebec Law 25 distinction:
 *  - "Accept All" — analytics and functional cookies permitted.
 *  - "Essential Only" — only strictly necessary cookies (auth session) stored.
 *    Under Quebec Law 25 this is the minimum permissible baseline.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        setVisible(true);
        return;
      }
      const parsed = JSON.parse(stored) as { version: string };
      // Re-prompt if the policy version has changed
      if (parsed.version !== CONSENT_VERSION) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function saveConsent(choice: "all" | "essential") {
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ choice, version: CONSENT_VERSION, ts: new Date().toISOString() })
      );
    } catch {
      /* localStorage unavailable — swallow silently */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D1B2A] border-t border-[#D4A574]/30 shadow-xl"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#F5EDD6]/80 leading-relaxed">
          We use essential cookies to keep you signed in and optional analytics cookies
          to improve the app. Religious affiliation data is treated as sensitive personal
          information under CCPA, PIPEDA, and Quebec Law 25.{" "}
          <Link href="/privacy" className="text-[#D4A574] underline underline-offset-2 hover:text-[#D4A574]/80">
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => saveConsent("essential")}
            className="px-4 py-2 text-sm rounded border border-[#D4A574]/40 text-[#F5EDD6]/70 hover:border-[#D4A574] hover:text-[#F5EDD6] transition-colors"
          >
            Essential Only
          </button>
          <button
            onClick={() => saveConsent("all")}
            className="px-4 py-2 text-sm rounded bg-[#D4A574] text-[#0D1B2A] font-semibold hover:bg-[#D4A574]/90 transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
