"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/hooks/useAuth";

/**
 * Account settings page — data rights and account management.
 *
 * Required by:
 *  - CCPA §1798.105 (right to delete)
 *  - CCPA §1798.110 (right to know / data portability)
 *  - PIPEDA Principle 9 (individual access)
 *  - Google Play & Apple App Store policies (in-app account deletion, June 2022)
 *
 * The delete flow is intentionally two-step to prevent accidental irreversible
 * actions. A confirmation dialog requires the user to type their email address
 * before deletion is permitted — a common UX pattern that reduces fat-finger risk.
 */
export default function AccountPage() {
  const { user, deleteAccount, exportData } = useAuth();
  const router = useRouter();

  const [exportLoading, setExportLoading] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExport() {
    setExportLoading(true);
    setExportError(null);
    try {
      await exportData();
      setExportDone(true);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDelete() {
    if (!user || deleteConfirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError("The email address you entered does not match your account email.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      router.replace("/");
    } catch (e) {
      setDeleteError(
        e instanceof Error
          ? e.message
          : "Account deletion failed. Please contact support@hellenicdir.com."
      );
      setDeleteLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-10">
      <div>
        <h1 className="text-3xl font-serif text-[#0D1B2A]">Account Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal data in accordance with your privacy rights.
        </p>
      </div>

      {/* ── Data Export ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-[#0D1B2A]">Download Your Data</h2>
        <p className="text-sm text-gray-600">
          Request a copy of all personal data Hellenic Directory holds about your account.
          This satisfies your{" "}
          <span className="font-medium">CCPA §1798.110 right-to-know</span> and{" "}
          <span className="font-medium">PIPEDA access rights</span>. The download is a
          JSON file containing your profile, directory memberships, and message history.
        </p>

        {exportDone && (
          <p className="text-sm text-green-700 font-medium">
            Your data export has been downloaded.
          </p>
        )}
        {exportError && <p className="text-sm text-red-600">{exportError}</p>}

        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="px-4 py-2 rounded-lg border border-[#0D1B2A] text-sm font-medium text-[#0D1B2A] hover:bg-[#0D1B2A]/5 disabled:opacity-50 transition-colors"
        >
          {exportLoading ? "Preparing download…" : "Download My Data"}
        </button>
      </section>

      {/* ── Account Deletion ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-red-800">Delete Account</h2>
        <p className="text-sm text-red-700">
          Permanently delete your account and all associated data. This satisfies the{" "}
          <span className="font-medium">CCPA §1798.105 right to delete</span>,{" "}
          <span className="font-medium">GDPR Article 17 right to erasure</span>, and{" "}
          <span className="font-medium">Quebec Law 25</span> de-indexing obligations.
        </p>
        <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
          <li>Your account will be deactivated immediately.</li>
          <li>All personal data will be permanently deleted after a 30-day grace period.</li>
          <li>Directory memberships, messages, and business listings will be removed.</li>
          <li>This action cannot be undone.</li>
        </ul>

        <button
          onClick={() => { setShowDeleteModal(true); setDeleteError(null); setDeleteConfirmEmail(""); }}
          className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Delete My Account
        </button>
      </section>

      {/* ── Privacy links ────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400">
        For questions about your data rights, see our{" "}
        <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>{" "}
        or contact{" "}
        <a href="mailto:privacy@hellenicdir.com" className="underline hover:text-gray-600">
          privacy@hellenicdir.com
        </a>.
      </p>

      {/* ── Delete confirmation modal ─────────────────────────────────── */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 id="delete-dialog-title" className="text-xl font-semibold text-red-800">
              Confirm Account Deletion
            </h3>
            <p className="text-sm text-gray-700">
              To confirm, please type your account email address:{" "}
              <span className="font-medium text-gray-900">{user?.email}</span>
            </p>

            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              autoComplete="off"
            />

            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading || !deleteConfirmEmail}
                className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Deleting…" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
