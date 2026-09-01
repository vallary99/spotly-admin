"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Dashboard", icon: "bi-speedometer2" },
  { href: "/businesses", label: "Businesses", icon: "bi-shop" },
  { href: "/transactions", label: "Transactions", icon: "bi-credit-card" },
  { href: "/moderation", label: "Moderation Queue", icon: "bi-flag" },
  { href: "/emails", label: "Email Templates", icon: "bi-envelope" },
  {
    href: "/configuration",
    label: "Configuration",
    icon: "bi-sliders",
    children: [
      { href: "/configuration", label: "Pricing & Tiers" },
      { href: "/configuration/categories", label: "Categories" },
      { href: "/configuration/neighborhoods", label: "Neighborhoods" },
      { href: "/configuration/quick-filters", label: "Quick Filters" },
    ],
  },
];

// Every protected page wraps its content in this — checks auth+role and
// redirects to /login rather than ever rendering admin data to a
// logged-out or non-admin visitor, even briefly. The backend enforces
// this independently on every /admin/* call regardless (a client-side
// check alone is never real security), this is just what makes the app
// usable/correct, not what makes it safe.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // AuthContext reads localStorage synchronously on the client's first
  // render (so a logged-in admin doesn't flash a "logged out" state),
  // but the server can never see localStorage at all — so the server's
  // render and an already-logged-in client's very first render produce
  // two genuinely DIFFERENT trees here ("Loading…" vs the full sidebar),
  // not just different text inside the same element. That's a
  // structural mismatch, which suppressHydrationWarning does NOT cover
  // (it only suppresses text-content differences within one element).
  // Gating on `mounted` — false on both the server's render and the
  // client's first render, only flipping true in an effect after the
  // client has actually mounted — guarantees the first hydration pass
  // is identical on both sides; the swap to real content then happens
  // as a normal post-mount update, not part of hydration at all.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && user === null) router.push("/login");
  }, [mounted, user, router]);

  if (!mounted || !user) {
    return <div className="flex min-h-screen items-center justify-center text-warm-clay">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
        <div className="mb-8 px-2">
          <Logo height={38} />
          <p className="mt-1 text-xs text-warm-clay">Admin</p>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-[rgba(199,101,58,0.1)] text-terracotta" : "text-text hover:bg-cream"
                  }`}
                >
                  <i className={`bi ${item.icon}`} />
                  {item.label}
                </Link>
                {/* Sub-items are always visible when their parent is
                    active, not collapsed behind a click — Configuration
                    has few enough sections (4) that a permanent list
                    beats a toggle, and it means a direct link works the
                    same as clicking through from the sidebar. */}
                {"children" in item && item.children && active && (
                  <div className="ml-3.5 mt-1 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`block rounded-lg px-3 py-2 text-[0.83rem] font-medium transition ${
                            subActive ? "bg-[rgba(199,101,58,0.1)] text-terracotta" : "text-warm-clay hover:bg-cream hover:text-text"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-border pt-4">
          <p className="mb-2 truncate px-3 text-xs text-warm-clay">{user.email}</p>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-error hover:bg-cream"
          >
            <i className="bi bi-box-arrow-right" /> Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden px-8 py-7">{children}</main>
    </div>
  );
}
