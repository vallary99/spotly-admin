"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, tierLabel, type AdminBusiness, type AdminBusinessDetail, type AdminReview, type BusinessFilters } from "@/lib/api";

// Only "Nairobi" launches for now — matches spotly-web's own CITIES
// constant (kept as a small local copy since these are separate
// projects, not worth sharing a package over one array).
const CITIES = ["Nairobi"];

const LISTING_STATUS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "PENDING", label: "Pending (no photo yet)" },
  { value: "ACTIVE", label: "Active" },
  { value: "DORMANT", label: "Dormant (underusing gallery)" },
  { value: "INACTIVE", label: "Inactive (30+ days, no photo)" },
];

export default function BusinessesPage() {
  const [filters, setFilters] = useState<BusinessFilters>({ sortBy: "createdAt", sortOrder: "DESC", limit: 50, offset: 0 });
  // Local, undebounced text the input actually shows — filters.search
  // only updates (and re-fetches) 400ms after typing stops, so every
  // keystroke doesn't fire its own request.
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState<{ total: number; results: AdminBusiness[] } | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminBusiness | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  // Single-business targets — separate from the two above, which are
  // for the filtered-segment campaign modals (Val, Sep 2026: rewarding
  // one specific business directly, not a whole filtered group).
  const [singleDiscountTarget, setSingleDiscountTarget] = useState<AdminBusiness | null>(null);
  const [singleTrialTarget, setSingleTrialTarget] = useState<AdminBusiness | null>(null);
  // Just the id — the modal fetches full detail itself on open, rather
  // than relying on the table row's already-trimmed AdminBusiness
  // shape (Val, Sep 2026: the detail view needs fields the table
  // doesn't even fetch anymore).
  const [detailTarget, setDetailTarget] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.businesses.list(filters).then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, [filters]);
  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
    api.config.neighborhoods.list().then((rows) => setNeighborhoods(rows.map((n) => n.name))).catch(() => {});
  }, []);

  // Debounced search — waits for a pause in typing before it actually
  // becomes a filter (and re-fetches), same reasoning as any live
  // search field (Val, Sep 2026: "a search field is also definitely
  // needed").
  useEffect(() => {
    const t = setTimeout(() => setFilter({ search: searchText.trim() || undefined }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Any real filter change starts back at page 1 — otherwise changing,
  // say, tier while sitting on page 3 of the old results would silently
  // show page 3 of a completely different, much shorter result set.
  // offset changes (actual pagination) are the one case that should NOT
  // reset itself back to 0, so this takes the patch and decides.
  const setFilter = (patch: Partial<BusinessFilters>) =>
    setFilters((f) => ({ ...f, ...patch, offset: "offset" in patch ? patch.offset : 0 }));

  // Only counts genuine filter criteria — sortBy/sortOrder/limit/offset
  // are always present (they're not "a filter" someone applied, they're
  // the default view), so Clear Filters shouldn't appear just because
  // the list is sorted a particular way or sitting on page 2.
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.city ||
      filters.neighborhood ||
      filters.category ||
      filters.tier ||
      filters.listingStatus ||
      filters.isSuspended !== undefined ||
      filters.isHiddenGem !== undefined ||
      filters.registeredAfter ||
      filters.registeredBefore ||
      filters.minProfileViews != null,
  );
  // Just the filters living in the side drawer — used to badge the
  // "More filters" button when one of THOSE specifically is active,
  // even though the top bar's own filters aren't (so the badge means
  // something precise: "there's an active filter you can't currently
  // see").
  const hasActiveDrawerFilters = Boolean(
    filters.city || filters.neighborhood || filters.category || filters.isHiddenGem !== undefined || filters.firstCohortPremiumTrial !== undefined || filters.minProfileViews != null,
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
            <i className="bi bi-stars mr-1.5" /> Grant free trial (Free package only)
          </button>
          <button
            onClick={() => setDiscountOpen(true)}
            className="rounded-full bg-olive px-4 py-2.5 text-sm font-semibold text-white"
          >
            <i className="bi bi-gift mr-1.5" /> Apply discount to these results
          </button>
        </div>
      </div>

      {/* Top bar — search, listing status, tier and date range are the
          ones judged most likely to be reached for often (Val, Sep
          2026); city, neighbourhood, category, hidden gem, min views
          and sort live in the side drawer instead, opened via "More
          filters" below. Tier's up here specifically because it
          directly gates the reward-program actions on this same page
          (discount needs a paid tier, trial needs Starter) — filtering
          by it first is a natural way into using those. */}
      <div className="mb-3 grid grid-cols-1 gap-3 rounded-spotly border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Search</span>
          <div className="relative">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warm-clay" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Business name…"
              className="w-full rounded-xl border border-border bg-cream py-2 pl-8 pr-3 text-sm outline-none focus:border-terracotta"
            />
          </div>
        </label>
        <LabeledSelect
          label="Listing status"
          value={filters.listingStatus ?? ""}
          options={LISTING_STATUS_OPTIONS}
          onChange={(v) => setFilter({ listingStatus: (v || undefined) as BusinessFilters["listingStatus"] })}
        />
        <LabeledSelect
          label="Tier"
          value={filters.tier ?? ""}
          options={[
            { value: "", label: "Any" },
            { value: "STARTER", label: "Free" },
            { value: "GROWTH", label: "Featured" },
            { value: "PREMIUM", label: "Premium" },
          ]}
          onChange={(v) => setFilter({ tier: v || undefined })}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Registered from</span>
          <input
            type="date"
            value={filters.registeredAfter ?? ""}
            onChange={(e) => setFilter({ registeredAfter: e.target.value || undefined })}
            className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Registered to</span>
          <input
            type="date"
            value={filters.registeredBefore ?? ""}
            onChange={(e) => setFilter({ registeredBefore: e.target.value || undefined })}
            className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
          />
        </label>
      </div>

      <div className="mb-5 flex items-center gap-2.5">
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-cream"
        >
          <i className="bi bi-sliders mr-1.5" /> More filters
          {hasActiveDrawerFilters && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-terracotta" />}
        </button>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchText(""); setFilters({ sortBy: "createdAt", sortOrder: "DESC", limit: 50, offset: 0 }); }}
            className="rounded-full bg-warm-brown px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
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
              <th className="px-4 py-3">Neighbourhood</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Saves</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-warm-clay">Loading…</td>
              </tr>
            )}
            {!loading && data?.results.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-warm-clay">No businesses match these filters.</td>
              </tr>
            )}
            {/* Row itself opens the detail modal — everything that used
                to be crammed into extra columns (tier, owner, and now
                registration date, went-live date, owner activity, the
                works) lives there instead (Val, Sep 2026: "to avoid
                crowding... every detail about a business is shown in a
                modal that pops up when the row is tapped"). Action
                buttons stop the click from bubbling up to the row, so
                clicking "Deactivate" doesn't also pop the modal open
                underneath it. */}
            {data?.results.map((b) => (
              <tr key={b.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-cream/50" onClick={() => setDetailTarget(b.id)}>
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{b.name}</div>
                  <div className="text-xs text-warm-clay">{b.category}</div>
                </td>
                <td className="px-4 py-3">{b.neighborhood ?? "—"}</td>
                <td className="px-4 py-3">{b.profileViews}</td>
                <td className="px-4 py-3">{b.savesCount}</td>
                <td className="px-4 py-3">
                  {b.isSuspended ? (
                    <span className="text-xs font-semibold text-error"><i className="bi bi-slash-circle mr-1" />Deactivated</span>
                  ) : (
                    <span className="text-xs font-semibold text-success"><i className="bi bi-check-circle mr-1" />Active</span>
                  )}
                  {b.isHiddenGem && <span className="ml-1.5 text-xs" title="Hidden Gem">✨</span>}
                </td>
                <td className="px-4 py-3">
                  {b.listingStatus === "ACTIVE" && <span className="text-xs font-semibold text-success">Active</span>}
                  {b.listingStatus === "PENDING" && <span className="text-xs font-semibold text-warm-clay">Pending</span>}
                  {b.listingStatus === "DORMANT" && <span className="text-xs font-semibold text-olive">Dormant</span>}
                  {b.listingStatus === "INACTIVE" && <span className="text-xs font-semibold text-error">Inactive</span>}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1.5">
                    {b.isSuspended ? (
                      <button
                        onClick={() => api.businesses.unsuspend(b.id).then(load).catch(() => {})}
                        className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-cream"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => setSuspendTarget(b)}
                        className="rounded-full border border-error px-2.5 py-1 text-xs font-semibold text-error hover:bg-[rgba(214,90,74,0.08)]"
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => api.businesses.setHiddenGem(b.id, !b.isHiddenGem).then(load).catch(() => {})}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-cream"
                      title={b.isHiddenGem ? "Remove Hidden Gem" : "Mark as Hidden Gem"}
                    >
                      ✨
                    </button>
                    {/* Single-business reward actions — separate from
                        the filtered-segment campaign buttons above the
                        table, for rewarding one specific business
                        directly (Val, Sep 2026). Discount only makes
                        sense on a paid tier; trial offer only on
                        Starter — same eligibility rules the backend
                        enforces either way, just reflected here too so
                        the wrong button isn't even offered. */}
                    {b.tier !== "STARTER" && (
                      <button
                        onClick={() => setSingleDiscountTarget(b)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-cream"
                        title="Grant a discount to this business"
                      >
                        % Off
                      </button>
                    )}
                    {b.tier === "STARTER" && (
                      <button
                        onClick={() => setSingleTrialTarget(b)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:bg-cream"
                        title="Grant a trial offer to this business"
                      >
                        Trial
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination — backend already supported take/skip and returns
          an honest total count; there was just never a way to actually
          reach anything past the first page (Val, Sep 2026 — confirmed
          this was genuinely missing, not partially built). */}
      {data && data.total > 0 && (
        <div className="mb-8 flex items-center justify-between text-sm text-warm-clay">
          <p>
            Showing {(filters.offset ?? 0) + 1}–{Math.min((filters.offset ?? 0) + (filters.limit ?? 50), data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter({ offset: Math.max(0, (filters.offset ?? 0) - (filters.limit ?? 50)) })}
              disabled={(filters.offset ?? 0) === 0}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-cream disabled:opacity-40"
            >
              <i className="bi bi-chevron-left" /> Previous
            </button>
            <button
              onClick={() => setFilter({ offset: (filters.offset ?? 0) + (filters.limit ?? 50) })}
              disabled={(filters.offset ?? 0) + (filters.limit ?? 50) >= data.total}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-cream disabled:opacity-40"
            >
              Next <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      )}

      {suspendTarget && (
        <SuspendModal business={suspendTarget} onClose={() => setSuspendTarget(null)} onDone={() => { setSuspendTarget(null); load(); }} />
      )}
      {discountOpen && (
        <DiscountModal filters={filters} onClose={() => setDiscountOpen(false)} onDone={() => { setDiscountOpen(false); load(); }} />
      )}
      {trialOpen && (
        <TrialModal filters={filters} onClose={() => setTrialOpen(false)} onDone={() => { setTrialOpen(false); load(); }} />
      )}
      {singleDiscountTarget && (
        <SingleDiscountModal
          business={singleDiscountTarget}
          onClose={() => setSingleDiscountTarget(null)}
          onDone={() => { setSingleDiscountTarget(null); load(); }}
        />
      )}
      {singleTrialTarget && (
        <SingleTrialModal
          business={singleTrialTarget}
          onClose={() => setSingleTrialTarget(null)}
          onDone={() => { setSingleTrialTarget(null); load(); }}
        />
      )}
      {drawerOpen && (
        <FilterDrawer
          filters={filters}
          categories={categories}
          neighborhoods={neighborhoods}
          onChange={setFilter}
          onClose={() => setDrawerOpen(false)}
        />
      )}
      {detailTarget && (
        <BusinessDetailModal
          businessId={detailTarget}
          onClose={() => setDetailTarget(null)}
          onChanged={load}
        />
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

// The less-frequently-touched filters, moved out of the always-visible
// top bar once the filter count grew past what felt easy to scan (Val,
// Sep 2026 — search/listing-status/tier/date-range stayed up top as
// the ones judged most reached-for; this is genuinely everything else).
// Slides in from the right rather than replacing the page content, so
// the table stays visible underneath while adjusting these.
function FilterDrawer({
  filters,
  categories,
  neighborhoods,
  onChange,
  onClose,
}: {
  filters: BusinessFilters;
  categories: string[];
  neighborhoods: string[];
  onChange: (patch: Partial<BusinessFilters>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(67,53,47,0.4)]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-xs flex-col overflow-y-auto bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg text-warm-brown">More filters</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream" aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="space-y-4">
          <LabeledSelect
            label="City"
            value={filters.city ?? ""}
            options={[{ value: "", label: "Any" }, ...CITIES.map((c) => ({ value: c, label: c }))]}
            onChange={(v) => onChange({ city: v || undefined })}
          />
          <LabeledSelect
            label="Neighbourhood"
            value={filters.neighborhood ?? ""}
            options={[{ value: "", label: "Any" }, ...neighborhoods.map((n) => ({ value: n, label: n }))]}
            onChange={(v) => onChange({ neighborhood: v || undefined })}
          />
          <LabeledSelect
            label="Category"
            value={filters.category ?? ""}
            options={[{ value: "", label: "Any" }, ...categories.map((c) => ({ value: c, label: c }))]}
            onChange={(v) => onChange({ category: v || undefined })}
          />
          <LabeledSelect
            label="Status"
            value={filters.isSuspended === undefined ? "" : String(filters.isSuspended)}
            options={[
              { value: "", label: "Any" },
              { value: "true", label: "Deactivated" },
              { value: "false", label: "Active" },
            ]}
            onChange={(v) => onChange({ isSuspended: v === "" ? undefined : v === "true" })}
          />
          <LabeledSelect
            label="Hidden Gem"
            value={filters.isHiddenGem === undefined ? "" : String(filters.isHiddenGem)}
            options={[
              { value: "", label: "Any" },
              { value: "true", label: "Hidden gem" },
              { value: "false", label: "Not marked" },
            ]}
            onChange={(v) => onChange({ isHiddenGem: v === "" ? undefined : v === "true" })}
          />
          <LabeledSelect
            label="Beta Partner"
            value={filters.firstCohortPremiumTrial === undefined ? "" : String(filters.firstCohortPremiumTrial)}
            options={[
              { value: "", label: "Any" },
              { value: "true", label: "First 100 (beta partner)" },
              { value: "false", label: "Not in first 100" },
            ]}
            onChange={(v) => onChange({ firstCohortPremiumTrial: v === "" ? undefined : v === "true" })}
          />
          <NumberField label="Min Views" value={filters.minProfileViews} onChange={(v) => onChange({ minProfileViews: v })} />
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
                onChange={(v) => onChange({ sortBy: v as BusinessFilters["sortBy"] })}
                className="min-w-0 flex-1"
              />
              <button
                onClick={() => onChange({ sortOrder: filters.sortOrder === "ASC" ? "DESC" : "ASC" })}
                className="shrink-0 rounded-xl border border-border bg-cream px-3 text-sm"
                title="Toggle order"
              >
                <i className={`bi ${filters.sortOrder === "ASC" ? "bi-sort-up" : "bi-sort-down"}`} />
              </button>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full rounded-full bg-terracotta py-2.5 text-sm font-semibold text-white">
          Done
        </button>
      </div>
    </div>
  );
}

// Formats a full date consistently across the detail modal — matches
// the short-form pattern already used elsewhere in this app (the
// dashboard's usage chart), just with a year added since these dates
// can be far apart in time, not all within the same recent chart.
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-warm-clay">{label}</span>
      <span className="text-right font-medium text-text">{value}</span>
    </div>
  );
}

// Everything the system knows about one business (Val, Sep 2026) —
// replaces trying to cram it all into extra table columns. Fetches its
// own detail on open rather than relying on the table row's already-
// trimmed AdminBusiness shape, which doesn't carry half of this.
function BusinessDetailModal({
  businessId,
  onClose,
  onChanged,
}: {
  businessId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<AdminBusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.businesses.getDetail(businessId).then(setDetail).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [businessId]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(67,53,47,0.4)] p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-spotly border border-border bg-surface p-6">
          {loading || !detail ? (
            <p className="py-8 text-center text-warm-clay">Loading…</p>
          ) : (
            <>
              <div className="mb-1 flex items-start justify-between">
                <h3 className="text-lg text-warm-brown">{detail.name}</h3>
                <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-cream" aria-label="Close">
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <p className="mb-4 text-xs text-warm-clay">{detail.categories.join(", ") || "No categories set"}</p>

              <div className="mb-4 rounded-2xl border border-border p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm-clay">About</p>
                <DetailRow label="Type" value={detail.type === "VENUE" ? "Venue" : "Experience Host"} />
                <DetailRow label="City / Neighbourhood" value={`${detail.city}${detail.neighborhood ? ` / ${detail.neighborhood}` : ""}`} />
                <DetailRow label="Address" value={detail.address || "—"} />
                <DetailRow label="Description" value={detail.description ? <span className="whitespace-pre-wrap text-left">{detail.description}</span> : "—"} />
              </div>

              <div className="mb-4 rounded-2xl border border-border p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm-clay">Contact</p>
                <DetailRow label="Call" value={detail.callPhone || "—"} />
                <DetailRow label="WhatsApp" value={detail.whatsappPhone || "—"} />
                <DetailRow label="Email" value={detail.email || "—"} />
                <DetailRow label="Website" value={detail.website || "—"} />
              </div>

              <div className="mb-4 rounded-2xl border border-border p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm-clay">Subscription</p>
                <DetailRow label="Tier" value={tierLabel(detail.tier)} />
                <DetailRow label="Billing status" value={detail.subscriptionStatus} />
                {detail.isGrandfathered && <DetailRow label="First-200 cohort" value="Yes" />}
                {detail.firstCohortPremiumTrial && <DetailRow label="Beta Partner" value="Yes (first 100)" />}
                {detail.discountPercent > 0 && <DetailRow label="Discount" value={`${detail.discountPercent}%`} />}
                {detail.isTrialing && <DetailRow label="Trial ends" value={formatDate(detail.trialEndsAt)} />}
                {!detail.isTrialing && detail.trialOfferTier && (
                  <DetailRow label="Trial offer pending" value={`${tierLabel(detail.trialOfferTier)}, ${detail.trialOfferDays}d — not yet claimed`} />
                )}
                {detail.gracePeriodEndsAt && <DetailRow label="Grace period ends" value={formatDate(detail.gracePeriodEndsAt)} />}
              </div>

              <div className="mb-4 rounded-2xl border border-border p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm-clay">Lifecycle</p>
                <DetailRow label="Registered" value={formatDate(detail.createdAt)} />
                <DetailRow label="Went live" value={formatDate(detail.wentLiveAt)} />
                <DetailRow label="Listing status" value={detail.listingStatus} />
                <DetailRow label="Hidden Gem" value={detail.isHiddenGem ? "Yes ✨" : "No"} />
                <DetailRow label="Deactivation status" value={detail.isSuspended ? "Deactivated" : "Active"} />
                {detail.isSuspended && detail.suspensionReason && <DetailRow label="Reason" value={detail.suspensionReason} />}
                {detail.isSuspended && <DetailRow label="Until" value={detail.suspendedUntil ? formatDate(detail.suspendedUntil) : "Indefinite"} />}
              </div>

              <div className="mb-4 rounded-2xl border border-border p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm-clay">Usage</p>
                <DetailRow label="Profile views (30d)" value={detail.profileViews} />
                <DetailRow label="Saves (30d)" value={detail.savesCount} />
              </div>

              {detail.owner && (
                <div className="mb-4 rounded-2xl border border-border p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm-clay">Owner</p>
                  <DetailRow label="Name" value={detail.owner.name} />
                  <DetailRow label="Email" value={detail.owner.email} />
                  <DetailRow label="Last active" value={formatDate(detail.owner.lastLoginAt)} />
                  {detail.owner.reviewsSuspended && <DetailRow label="Review posting" value="Restricted" />}
                </div>
              )}

              <div className="rounded-2xl border border-border p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warm-clay">Reviews</p>
                <DetailRow
                  label="Rating"
                  value={detail.reviewsSummary.count > 0 ? `${detail.reviewsSummary.average} ★ (${detail.reviewsSummary.count})` : "No reviews yet"}
                />
                {detail.reviewsSummary.count > 0 && (
                  <button
                    onClick={() => setReviewsOpen(true)}
                    className="mt-2 w-full rounded-full border border-border py-2 text-sm font-semibold hover:bg-cream"
                  >
                    Manage reviews
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {reviewsOpen && detail && (
        <ReviewsModal
          businessId={detail.id}
          businessName={detail.name}
          onClose={() => setReviewsOpen(false)}
          onChanged={() => { load(); onChanged(); }}
        />
      )}
    </>
  );
}

// Opened from "Manage reviews" above — a separate, paginated layer
// rather than crammed into the same modal, since a popular business
// could have hundreds of reviews (Val, Sep 2026: "How are you planning
// to fit all comments in a pop-up... will that lead to a reviews
// page?" — this, instead: a focused panel reached from the business
// it belongs to, same Previous/Next pagination as the businesses table
// itself, not a whole standalone section of the app).
function ReviewsModal({
  businessId,
  businessName,
  onClose,
  onChanged,
}: {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const LIMIT = 20;
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ total: number; results: AdminReview[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.businesses.getReviews(businessId, LIMIT, offset).then(setData).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [businessId, offset]);

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await api.reviews.delete(id);
      load();
      onChanged();
    } catch {
      // leave the list as-is on failure, same posture as the rest of
      // this app's action buttons
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSuspend = async (r: AdminReview) => {
    setBusyId(r.id);
    try {
      await api.users.setReviewSuspension(r.reviewerId, !r.reviewerSuspended);
      load();
    } catch {
      // same posture as above
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(67,53,47,0.5)] p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-spotly border border-border bg-surface p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg text-warm-brown">Reviews — {businessName}</h3>
            <p className="text-xs text-warm-clay">{data ? `${data.total} total` : "…"}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-cream" aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {loading && <p className="py-8 text-center text-warm-clay">Loading…</p>}
          {!loading && data?.results.length === 0 && <p className="py-8 text-center text-warm-clay">No reviews.</p>}
          {data?.results.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border p-3">
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">{r.reviewerName}</p>
                  <p className="text-xs text-warm-clay">{r.reviewerEmail}</p>
                </div>
                <span className="text-sm font-semibold text-terracotta">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              {r.text && <p className="mb-2 text-sm text-text">{r.text}</p>}
              <p className="mb-2 text-xs text-warm-clay">{formatDate(r.createdAt)}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={busyId === r.id}
                  className="rounded-full border border-error px-3 py-1 text-xs font-semibold text-error hover:bg-[rgba(214,90,74,0.08)] disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleToggleSuspend(r)}
                  disabled={busyId === r.id}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-cream disabled:opacity-50"
                  title="Restricts this user from posting reviews on ANY business, not just this one"
                >
                  {r.reviewerSuspended ? "Unrestrict reviewer" : "Restrict reviewer"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {data && data.total > LIMIT && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm text-warm-clay">
            <p>{offset + 1}–{Math.min(offset + LIMIT, data.total)} of {data.total}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                disabled={offset === 0}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-cream disabled:opacity-40"
              >
                <i className="bi bi-chevron-left" /> Previous
              </button>
              <button
                onClick={() => setOffset((o) => o + LIMIT)}
                disabled={offset + LIMIT >= data.total}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-cream disabled:opacity-40"
              >
                Next <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuspendModal({ business, onClose, onDone }: { business: AdminBusiness; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      // Reason is optional (see AdminBusinessService.suspend's default)
      // — leave it blank for a routine, no-explanation-needed pause;
      // fill it in when there's an actual policy-violation reason the
      // owner should see.
      await api.businesses.suspend(business.id, reason.trim() || undefined, until || undefined);
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
        <h3 className="mb-1 text-lg text-warm-brown">Deactivate {business.name}</h3>
        <p className="mb-4 text-xs text-warm-clay">Hides this business from public browse/search immediately. The owner can still see and edit their own profile.</p>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Reason (optional — shown to the owner if given)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Until (optional — blank means indefinite)</span>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2 text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 rounded-full bg-error py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Deactivating…" : "Deactivate"}
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
          Applies a discount to every business matching your current filters. Free-package businesses are automatically
          excluded — a % off a free plan doesn&apos;t mean anything, use &quot;Grant free trial&quot; for those instead.
        </p>
        {result ? (
          <>
            <p className="mb-2 rounded-xl bg-[rgba(93,96,65,0.08)] p-3 text-sm text-olive">
              <i className="bi bi-check-circle mr-1.5" />
              {result.affected > 0 ? `Applied ${percent}% off to ${result.affected} businesses.` : result.message}
            </p>
            {!!result.excludedStarterCount && (
              <p className="mb-4 text-xs text-warm-clay">{result.excludedStarterCount} Free-package businesses were skipped.</p>
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
          Grants trial eligibility to Free-package businesses matching your current filters (any non-Free businesses
          in the results are skipped). The owner still has to click &quot;Start Trial&quot; themselves — this doesn&apos;t
          upgrade them immediately.
        </p>
        {result ? (
          <>
            <p className="mb-4 rounded-xl bg-[rgba(199,101,58,0.08)] p-3 text-sm text-terracotta">
              <i className="bi bi-check-circle mr-1.5" />
              {result.affected > 0
                ? `Offered a ${days}-day ${tierLabel(tier)} trial to ${result.affected} businesses.`
                : result.message}
            </p>
            <button onClick={onDone} className="w-full rounded-full bg-terracotta py-2 text-sm font-semibold text-white">Done</button>
          </>
        ) : (
          <>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-semibold text-warm-clay">Trial tier</span>
              <select value={tier} onChange={(e) => setTier(e.target.value as "GROWTH" | "PREMIUM")} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta">
                <option value="GROWTH">Featured</option>
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

// Single-business equivalent of DiscountModal above — same shape, but
// targets exactly one business rather than a whole filtered segment
// (Val, Sep 2026). The email that goes out is automatic on the backend
// the moment this saves — nothing further to do here once it succeeds.
function SingleDiscountModal({ business, onClose, onDone }: { business: AdminBusiness; onClose: () => void; onDone: () => void }) {
  const [percent, setPercent] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.businesses.grantDiscount(business.id, percent);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't grant that discount.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(67,53,47,0.4)] p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-spotly border border-border bg-surface p-6">
        <h3 className="mb-1 text-lg text-warm-brown">Grant a discount to {business.name}</h3>
        <p className="mb-4 text-xs text-warm-clay">
          Emails the owner immediately with the discount, and applies it to their {tierLabel(business.tier)} plan.
        </p>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Discount (%)</span>
          <input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
        </label>
        {error && <p className="mb-4 text-sm text-error">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2 text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 rounded-full bg-terracotta py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Granting…" : "Grant discount"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Single-business equivalent of TrialModal above.
function SingleTrialModal({ business, onClose, onDone }: { business: AdminBusiness; onClose: () => void; onDone: () => void }) {
  const [tier, setTier] = useState<"GROWTH" | "PREMIUM">("GROWTH");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.businesses.grantTrialOffer(business.id, tier, days);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't grant that trial.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(67,53,47,0.4)] p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-spotly border border-border bg-surface p-6">
        <h3 className="mb-1 text-lg text-warm-brown">Grant a trial to {business.name}</h3>
        <p className="mb-4 text-xs text-warm-clay">
          Emails the owner immediately. Grants eligibility only — they still have to click &quot;Start Trial&quot;
          themselves for the clock to actually start.
        </p>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Trial tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value as "GROWTH" | "PREMIUM")} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta">
            <option value="GROWTH">Featured</option>
            <option value="PREMIUM">Premium</option>
          </select>
        </label>
        <label className="mb-5 block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Trial length (days)</span>
          <input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
        </label>
        {error && <p className="mb-4 text-sm text-error">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2 text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={busy} className="flex-1 rounded-full bg-terracotta py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? "Granting…" : "Grant trial"}
          </button>
        </div>
      </div>
    </div>
  );
}
