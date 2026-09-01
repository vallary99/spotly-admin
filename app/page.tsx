"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, tierLabel, type AnalyticsSummary, type UsagePoint } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [usage, setUsage] = useState<UsagePoint[]>([]);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.analytics.summary(),
      api.analytics.usage(granularity, granularity === "month" ? 180 : granularity === "week" ? 90 : 30),
    ])
      .then(([s, u]) => {
        setSummary(s);
        setUsage(u);
      })
      .catch(() => {
        // A 401 here (e.g. this page mounting before AdminShell has
        // finished checking auth, or a token that's simply expired)
        // already gets handled — api.ts's request() clears the token
        // and fires "spotly-admin:unauthorized" on any 401, which
        // AdminShell listens for and redirects on. Without this catch,
        // the same rejection was ALSO unhandled here, which is what
        // actually crashed the page with Next's error overlay.
      })
      .finally(() => setLoading(false));
  }, [granularity]);

  const chartData = usage.map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <AdminShell>
      <h1 className="mb-1 text-2xl text-warm-brown">Dashboard</h1>
      <p className="mb-6 text-sm text-warm-clay">Platform-wide numbers, updated live.</p>

      {loading && !summary ? (
        <p className="text-warm-clay">Loading…</p>
      ) : summary ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard label="Registered Businesses" value={summary.totalBusinesses} icon="bi-shop" />
            <SummaryCard label="Registered Users" value={summary.totalUsers} icon="bi-people" />
            <SummaryCard label="Active Businesses" value={summary.activeBusinesses} icon="bi-check-circle" accent="success" />
            <SummaryCard label="Suspended" value={summary.suspendedBusinesses} icon="bi-slash-circle" accent="error" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-spotly border border-border bg-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-warm-clay">Tier Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(summary.tierBreakdown).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between text-sm">
                    <span>{tierLabel(tier)}</span>
                    <span className="font-semibold text-warm-brown">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-spotly border border-border bg-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-warm-clay">User Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Registered (no business)</span>
                  <span className="font-semibold text-warm-brown">{summary.registeredUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Business Owners</span>
                  <span className="font-semibold text-warm-brown">{summary.businessOwners}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-spotly border border-border bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-warm-clay">Usage over time</h3>
              <div className="flex gap-1 rounded-full border border-border bg-cream p-1">
                {(["day", "week", "month"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                      granularity === g ? "bg-terracotta text-white" : "text-warm-clay"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#E8DDD4" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#9E6B4A" fontSize={12} />
                <YAxis stroke="#9E6B4A" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8DDD4" }} />
                <Legend />
                <Line type="monotone" dataKey="views" name="Profile views" stroke="#C7653A" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saves" name="Saves" stroke="#5D6041" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            {chartData.length === 0 && (
              <p className="mt-4 text-center text-sm text-warm-clay">No usage data in this window yet.</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-error">Couldn&apos;t load dashboard data.</p>
      )}
    </AdminShell>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: string;
  accent?: "success" | "error";
}) {
  return (
    <div className="rounded-spotly border border-border bg-surface p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warm-clay">
        <i className={`bi ${icon}`} /> {label}
      </div>
      <div className={`text-3xl font-bold ${accent === "success" ? "text-success" : accent === "error" ? "text-error" : "text-warm-brown"}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
