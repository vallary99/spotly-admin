"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo height={48} />
          <p className="mt-2 text-sm text-warm-clay">Reset your admin password.</p>
        </div>
        <div className="rounded-spotly border border-border bg-surface p-7 shadow-[0_18px_40px_rgba(67,53,47,0.1)]">
          {sent ? (
            <>
              <p className="mb-6 text-sm text-warm-clay">
                If <span className="font-semibold text-text">{email}</span> has an admin account, we&apos;ve sent a reset link — check your inbox.
              </p>
              <Link href="/login" className="block w-full rounded-full bg-terracotta py-2.5 text-center text-sm font-semibold text-white">
                Back to login
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="mb-5 block">
                <span className="mb-1 block text-xs font-semibold text-warm-clay">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-cream px-4 py-2.5 text-sm outline-none focus:border-terracotta"
                />
              </label>
              {error && <p className="mb-4 text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-terracotta py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
              <Link href="/login" className="mt-3 block text-center text-xs text-warm-clay hover:text-terracotta">
                Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
