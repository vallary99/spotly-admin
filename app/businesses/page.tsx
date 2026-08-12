"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, type AdminBusiness, type BusinessFilters } from "@/lib/api";

// Only "Nairobi" launches for now — matches spotly-web's own CITIES
// constant (kept as a small local copy since these are separate
// projects, not worth sharing a package over one array).
const CITIES = ["Nairobi"];

export default function BusinessesPage() {
  const [filters, setFilters] = useState<BusinessFilters>({ sortBy: "createdAt", sortOrder: "DESC", limit: 50 });
  const [data, setData] = useState<{ total: number; results: AdminBusiness[] } | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspendTarget, setSuspendTarget] = useState<AdminBusiness | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.businesses.list(filters).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);
  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  const setFilter = (patch: Partial<BusinessFilters>) => setFilters((f) => ({ ...f, ...patch }));

  // Only counts genuine filter criteria — sortBy/sortOrder/limit are
  // always present (they're not "a filter" someone applied, they're the
  // default view), so Clear Filters shouldn't appear just because the
  // list is sorted a particular way.
  const hasActiveFilters = Boolean(
    filters.city ||
      filters.category ||
      filters.tier ||
      filters.isSuspended !== undefined ||
      filters.isHiddenGem !== undefined ||
      filters.minProfileViews != null,
  );

  return (
    <AdminShell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-warm-brown">Businesses</h1>
          <p className="text-sm text-warm-clay">{data ? `${data.total} matching` : "…"} — every filter below combines concurrently.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTrialOpen(true)}
            className="rounded-full bg-terracotta px-4 py-2.5 text-sm font-semibold text-white"
          >
            <i className="bi bi-stars mr-1.5" /> Grant free trial (Starter only)
          </button>
          <button
            onClick={() => setDiscountOpen(true)}
            className="rounded-full bg-olive px-4 py-2.5 text-sm font-semibold text-white"
          >
            <i className="bi bi-gift mr-1.5" /> Apply discount to these results
          </button>
        </div>
      </div>

      {/* Filters — anything with a fixed, known set of values is a
          dropdown (city, category, tier, suspended, hidden gem, sort);
          only the open-ended numeric range (min views) stays a plain
          input. */}
      <div className="mb-5 grid grid-cols-2 gap-3 rounded-spotly border border-border bg-surface p-4 md:grid-cols-4 lg:grid-cols-6">
        <LabeledSelect
          label="City"
          value={filters.city ?? ""}
          options={[{ value: "", label: "Any" }, ...CITIES.map((c) => ({ value: c, label: c }))]}
          onChange={(v) => setFilter({ city: v || undefined })}
        />
        <LabeledSelect
          label="Category"
          value={filters.category ?? ""}
          options={[{ value: "", label: "Any" }, ...categories.map((c) => ({ value: c, label: c }))]}
          onChange={(v) => setFilter({ category: v || undefined })}
        />
        <LabeledSelect
          label="Tier"
          value={filters.tier ?? ""}
          options={[
            { value: "", label: "Any" },
            { value: "STARTER", label: "Starter" },
            { value: "GROWTH", label: "Growth" },
            { value: "PREMIUM", label: "Premium" },
          ]}
          onChange={(v) => setFilter({ tier: v || undefined })}
        />
        <LabeledSelect
          label="Suspended"
          value={filters.isSuspended === undefined ? "" : String(filters.isSuspended)}
          options={[
            { value: "", label: "Any" },
            { value: "true", label: "Suspended" },
            { value: "false", label: "Active" },
          ]}
          onChange={(v) => setFilter({ isSuspended: v === "" ? undefined : v === "true" })}
        />
        <LabeledSelect
          label="Hidden Gem"
          value={filters.isHiddenGem === undefined ? "" : String(filters.isHiddenGem)}
          options={[
            { value: "", label: "Any" },
            { value: "true", label: "Hidden gem" },
            { value: "false", label: "Not marked" },
          ]}
          onChange={(v) => setFilter({ isHiddenGem: v === "" ? undefined : v === "true" })}
        />
        <NumberField label="Min Views" value={filters.minProfileViews} onChange={(v) => setFilter({ minProfileViews: v })} />
        <div>
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Sort by</span>
          <div className="flex gap-1.5">
            <LabeledSelect
              label=""
              value={filters.sortBy ?? "createdAt"}
              options={[
                { value: "createdAt", label: "Registration date" },
                { value: "profileViews", label: "Profile views" },
                { value: "savesCount", label: "Saves" },
                { value: "name", label: "Name" },
              ]}
              onChange={(v) => setFilter({ sortBy: v as BusinessFilters["sortBy"] })}
              className="min-w-0 flex-1"
            />
            <button
              onClick={() => setFilter({ sortOrder: filters.sortOrder === "ASC" ? "DESC" : "ASC" })}
              className="shrink-0 rounded-xl border border-border bg-cream px-3 text-sm"
              title="Toggle order"
            >
              <i className={`bi ${filters.sortOrder === "ASC" ? "bi-sort-up" : "bi-sort-down"}`} />
            </button>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ sortBy: "createdAt", sortOrder: "DESC", limit: 50 })}
            className="h-fit self-end rounded-xl bg-warm-brown px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-spotly border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-warm-clay">
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Saves</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-warm-clay">Loading…</td>
              </tr>
            )}
            {!loading && data?.results.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-warm-clay">No businesses match these filters.</td>
              </tr>
            )}
            {data?.results.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0 hover:bg-cream/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{b.name}</div>
                  <div className="text-xs text-warm-clay">{b.category}</div>
                </td>
                <td className="px-4 py-3">{b.city}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold">{b.tier}</span>
                  {b.discountPercent > 0 && <span className="ml-1 text-xs text-olive">-{b.discountPercent}%</span>}
                  {b.isTrialing && <span className="ml-1 text-xs text-terracotta">trial</span>}
                  {!b.isTrialing && b.trialOfferTier && <span className="ml-1 text-xs text-warm-clay">offer pending</span>}
                </td>
                <td className="px-4 py-3">{b.profileViews}</td>
                <td className="px-4 py-3">{b.savesCount}</td>
                <td className="px-4 py-3">
                  {b.isSuspended ? (
                    <span className="text-xs font-semibold text-error"><i className="bi bi-slash-circle mr-1" />Suspended</span>
                  ) : (
                    <span className="text-xs font-semibold text-success"><i className="bi bi-check-circle mr-1" />Active</span>
                  )}
                  {b.isHiddenGem && <span className="ml-1.5 text-xs" title="Hidden Gem">✨</span>}
                </td>
                <td className="px-4 py-3 text-xs text-warm-clay">{b.ownerEmail}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {b.isSuspended ? (
                      <button
                        onClick={() => api.businesses.unsuspend(b.id).then(load).catch(() => {})}
                        className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-cream"
                      >
                        Unsuspend
                      </button>
                    ) : (
                      <button
                        onClick={() => setSuspendTarget(b)}
                        className="rounded-full border border-error px-2.5 py-1 text-xs font-semibold text-error hover:bg-[rgba(214,90,74,0.08)]"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => api.businesses.setHiddenGem(b.id, !b.isHiddenGem).then(load).catch(() => {})}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-cream"
                      title={b.isHiddenGem ? "Remove Hidden Gem" : "Mark as Hidden Gem"}
                    >
                      ✨
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {suspendTarget && (
        <SuspendModal business={suspendTarget} onClose={() => setSuspendTarget(null)} onDone={() => { setSuspendTarget(null); load(); }} />
      )}
      {discountOpen && (
        <DiscountModal filters={filters} onClose={() => setDiscountOpen(false)} onDone={() => { setDiscountOpen(false); load(); }} />
      )}
      {trialOpen && (
        <TrialModal filters={filters} onClose={() => setTrialOpen(false)} onDone={() => { setTrialOpen(false); load(); }} />
      )}
    </AdminShell>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-warm-clay">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
      />
    </label>
  );
}

// Options carry a separate value/label pair — lets a filter's underlying
// value stay a technical key (e.g. "createdAt") while showing a
// friendlier label ("Registration date") in the dropdown itself.
function LabeledSelect({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1 block text-xs font-semibold text-warm-clay">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function SuspendModal({ business, onClose, onDone }: { business: AdminBusiness; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await api.businesses.suspend(business.id, reason, until || undefined);
      onDone();
    } catch {
      // same reasoning as elsewhere in this app — a 401 already gets
      // handled globally; other errors just leave the modal open with
      // busy reset, rather than crashing the whole page.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(67,53,47,0.4)] p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-spotly border border-border bg-surface p-6">
        <h3 className="mb-1 text-lg text-warm-brown">Suspend {business.name}</h3>
        <p className="mb-4 text-xs text-warm-clay">Hides this business from public browse/search immediately. The owner can still see and edit their own profile.</p>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Reason (required)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Until (optional — blank means indefinite)</span>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2 text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={busy || !reason.trim()} className="flex-1 rounded-full bg-error py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Suspending…" : "Suspend"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscountModal({ filters, onClose, onDone }: { filters: BusinessFilters; onClose: () => void; onDone: () => void }) {
  const [percent, setPercent] = useState(10);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ affected: number; excludedStarterCount?: number; message?: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.businesses.discountCampaign(filters, percent);
      setResult(res);
    } catch {
      // see SuspendModal's submit() above
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(67,53,47,0.4)] p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-spotly border border-border bg-surface p-6">
        <h3 className="mb-1 text-lg text-warm-brown">Reward program — discount</h3>
        <p className="mb-4 text-xs text-warm-clay">
          Applies a discount to every business matching your current filters. Starter-tier businesses are automatically
          excluded — a % off a free plan doesn&apos;t mean anything, use &quot;Grant free trial&quot; for those instead.
        </p>
        {result ? (
          <>
            <p className="mb-2 rounded-xl bg-[rgba(93,96,65,0.08)] p-3 text-sm text-olive">
              <i className="bi bi-check-circle mr-1.5" />
              {result.affected > 0 ? `Applied ${percent}% off to ${result.affected} businesses.` : result.message}
            </p>
            {!!result.excludedStarterCount && (
              <p className="mb-4 text-xs text-warm-clay">{result.excludedStarterCount} Starter-tier businesses were skipped.</p>
            )}
            <button onClick={onDone} className="w-full rounded-full bg-terracotta py-2 text-sm font-semibold text-white">Done</button>
          </>
        ) : (
          <>
            <label className="mb-5 block">
              <span className="mb-1 block text-xs font-semibold text-warm-clay">Discount percent</span>
              <input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
            </label>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full border border-border py-2 text-sm font-semibold">Cancel</button>
              <button onClick={submit} disabled={busy} className="flex-1 rounded-full bg-olive py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? "Applying…" : "Apply"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TrialModal({ filters, onClose, onDone }: { filters: BusinessFilters; onClose: () => void; onDone: () => void }) {
  const [tier, setTier] = useState<"GROWTH" | "PREMIUM">("GROWTH");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ affected: number; message?: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.businesses.trialCampaign(filters, tier, days);
      setResult(res);
    } catch {
      // see SuspendModal's submit() above
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(67,53,47,0.4)] p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-spotly border border-border bg-surface p-6">
        <h3 className="mb-1 text-lg text-warm-brown">Reward program — free trial</h3>
        <p className="mb-4 text-xs text-warm-clay">
          Grants trial eligibility to Starter-tier businesses matching your current filters (any non-Starter businesses
          in the results are skipped). The owner still has to click &quot;Start Trial&quot; themselves — this doesn&apos;t
          upgrade them immediately.
        </p>
        {result ? (
          <>
            <p className="mb-4 rounded-xl bg-[rgba(199,101,58,0.08)] p-3 text-sm text-terracotta">
              <i className="bi bi-check-circle mr-1.5" />
              {result.affected > 0
                ? `Offered a ${days}-day ${tier === "GROWTH" ? "Growth" : "Premium"} trial to ${result.affected} businesses.`
                : result.message}
            </p>
            <button onClick={onDone} className="w-full rounded-full bg-terracotta py-2 text-sm font-semibold text-white">Done</button>
          </>
        ) : (
          <>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-semibold text-warm-clay">Trial tier</span>
              <select value={tier} onChange={(e) => setTier(e.target.value as "GROWTH" | "PREMIUM")} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta">
                <option value="GROWTH">Growth</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </label>
            <label className="mb-5 block">
              <span className="mb-1 block text-xs font-semibold text-warm-clay">Trial length (days)</span>
              <input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
            </label>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full border border-border py-2 text-sm font-semibold">Cancel</button>
              <button onClick={submit} disabled={busy} className="flex-1 rounded-full bg-terracotta py-2 text-sm font-semibold text-white disabled:opacity-60">
                {busy ? "Granting…" : "Grant trial"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
