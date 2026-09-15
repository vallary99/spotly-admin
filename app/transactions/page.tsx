"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, type Transaction, type TransactionFilters } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "text-success",
  PENDING: "text-warning",
  FAILED: "text-error",
};

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ limit: 50 });
  const [data, setData] = useState<{ total: number; successTotalAmount: number; results: Transaction[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.transactions.list(filters).then(setData).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [filters]);

  const setFilter = (patch: Partial<TransactionFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const hasActiveFilters = Boolean(filters.status || filters.purpose || filters.from || filters.to);

  return (
    <AdminShell>
      <h1 className="mb-1 text-2xl text-warm-brown">Transactions</h1>
      <p className="mb-6 text-sm text-warm-clay">
        {data ? `${data.total} matching · KES ${data.successTotalAmount.toLocaleString()} collected in this view` : "…"}
      </p>

      {/* Filters */}
      <div className="mb-5 grid grid-cols-2 gap-3 rounded-spotly border border-border bg-surface p-4 md:grid-cols-4 lg:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Status</span>
          <select
            value={filters.status ?? ""}
            onChange={(e) => setFilter({ status: e.target.value || undefined })}
            className="w-full appearance-none rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
          >
            <option value="">Any</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">Purpose</span>
          <select
            value={filters.purpose ?? ""}
            onChange={(e) => setFilter({ purpose: e.target.value || undefined })}
            className="w-full appearance-none rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
          >
            <option value="">Any</option>
            <option value="SUBSCRIPTION">Subscription</option>
            <option value="EXPERIENCE_ADDON">Experience add-on</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">From</span>
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => setFilter({ from: e.target.value || undefined })}
            className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-warm-clay">To</span>
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => setFilter({ to: e.target.value || undefined })}
            className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
          />
        </label>
        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ limit: 50 })}
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
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">M-Pesa Receipt</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-warm-clay">Loading…</td></tr>
            )}
            {!loading && data?.results.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-warm-clay">No transactions match these filters.</td></tr>
            )}
            {data?.results.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-cream/50">
                <td className="px-4 py-3">{t.businessName ?? t.businessId}</td>
                <td className="px-4 py-3">{t.purpose === "SUBSCRIPTION" ? "Subscription" : "Experience add-on"}</td>
                <td className="px-4 py-3 font-semibold">
                  {t.currency} {t.amount.toLocaleString()}
                </td>
                <td className={`px-4 py-3 font-semibold ${STATUS_STYLES[t.status] ?? ""}`}>{t.status}</td>
                <td className="px-4 py-3 text-xs text-warm-clay">{t.mpesaReceiptNumber ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-warm-clay">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {/* PENDING payments already get auto-rechecked every 5
                      minutes (see PaymentReconciliationService) — this is
                      for support cases where waiting isn't ideal: a
                      business owner says they paid and wants to know now,
                      not in up to 5 minutes. */}
                  {t.status === "PENDING" && <RecheckButton id={t.id} onDone={load} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function RecheckButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const recheck = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.transactions.recheck(id);
      if ("skipped" in result) {
        setMessage(result.skipped);
      } else {
        onDone();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't check that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={recheck}
        disabled={busy}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-cream disabled:opacity-50"
      >
        {busy ? "Checking…" : "Recheck now"}
      </button>
      {message && <p className="mt-1 text-xs text-warm-clay">{message}</p>}
    </div>
  );
}
