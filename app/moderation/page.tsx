"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, type ModerationItem } from "@/lib/api";

const REASON_LABELS: Record<string, string> = {
  routine_spot_check: "Routine spot check",
  duplicate_hash_flag: "Possible duplicate/stolen image",
  user_report: "Reported by a user",
};

export default function ModerationPage() {
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => api.moderation.list().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const resolve = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      await api.moderation.resolve(id, action);
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch {
      // Same reasoning as load() above — a 401 is already handled via
      // the global unauthorized event; this just stops it from also
      // crashing as an unhandled rejection here.
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <h1 className="mb-1 text-2xl text-warm-brown">Moderation Queue</h1>
      <p className="mb-6 text-sm text-warm-clay">
        {items ? `${items.length} pending` : "…"} — spot-checked uploads and possible duplicate/stolen images, waiting for a human look.
      </p>

      {items === null && <p className="text-warm-clay">Loading…</p>}
      {items?.length === 0 && (
        <div className="rounded-spotly border border-border bg-surface p-10 text-center text-warm-clay">
          <i className="bi bi-check-circle mb-2 block text-3xl text-success" />
          Nothing pending review.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items?.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-spotly border border-border bg-surface">
            {item.media && item.media.type === "VIDEO" ? (
              <video src={item.media.url} controls className="h-40 w-full bg-black object-cover" />
            ) : (
              item.media && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.media.url} alt="" className="h-40 w-full object-cover" />
              )
            )}
            <div className="p-3">
              <p className="mb-0.5 text-xs font-semibold text-warm-clay">{REASON_LABELS[item.reason] ?? item.reason}</p>
              <p className="mb-3 truncate text-sm font-medium">{item.media?.businessName ?? "Unknown business"}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => resolve(item.id, "approve")}
                  disabled={busyId === item.id}
                  className="flex-1 rounded-full bg-success py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => resolve(item.id, "reject")}
                  disabled={busyId === item.id}
                  className="flex-1 rounded-full bg-error py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
