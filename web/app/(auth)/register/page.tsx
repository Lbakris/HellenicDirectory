"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      router.push("/login?registered=1");
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-700 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-2xl text-gold">Hellenic Directory</Link>
          <p className="text-cream/60 text-sm mt-1">of America</p>
        </div>

        <div className="bg-navy-600 border border-navy-500 rounded-lg p-8">
          <h1 className="font-serif text-2xl text-cream mb-6">Create Account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field id="fullName" label="Full Name" type="text" value={form.fullName} onChange={update("fullName")} autoComplete="name" required />
            <Field id="email" label="Email" type="email" value={form.email} onChange={update("email")} autoComplete="email" required />
            <Field id="password" label="Password" type="password" value={form.password} onChange={update("password")} autoComplete="new-password" required />
            <Field id="phone" label="Phone (optional)" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-navy py-2 rounded font-medium hover:bg-gold-400 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-cream/50 text-sm text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-gold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, type, value, onChange, autoComplete, required }: {
  id: string; label: string; type: string; value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  autoComplete?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-cream/70 text-sm mb-1" htmlFor={id}>{label}</label>
      <input
        id={id} type={type} value={value} onChange={onChange}
        autoComplete={autoComplete} required={required}
        className="w-full bg-navy-700 border border-navy-500 rounded px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold"
      />
    </div>
  );
}
