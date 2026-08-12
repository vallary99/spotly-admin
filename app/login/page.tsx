"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { Logo } from "@/components/Logo";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in, try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo height={48} />
          <p className="mt-2 text-sm text-warm-clay">Platform operations — not the consumer app.</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-spotly border border-border bg-surface p-7 shadow-[0_18px_40px_rgba(67,53,47,0.1)]">
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold text-warm-clay">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-border bg-cream px-4 py-2.5 text-sm outline-none focus:border-terracotta"
            />
          </label>
          <label className="mb-5 block">
            <span className="mb-1 block text-xs font-semibold text-warm-clay">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-border bg-cream px-4 py-2.5 text-sm outline-none focus:border-terracotta"
            />
          </label>
          {error && <p className="mb-4 text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-terracotta py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <Link href="/forgot-password" className="mt-3 block text-center text-xs text-warm-clay hover:text-terracotta">
            Forgot password?
          </Link>
        </form>
        <p className="mt-5 text-center text-xs text-warm-clay">
          No self-serve signup — admin access is granted directly, not requested here.
        </p>
      </div>
    </div>
  );
}
