"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, type EmailSendLog } from "@/lib/api";

// Split out from Email Templates (which moved under Configuration) into
// its own top-level page (Val, Sep 2026). Email and Business are now
// separate columns rather than one overloaded column that showed a raw
// address for prospect outreach and a business name for everything
// else — recipientEmail is real data now, not a display-time guess.
export default function SendHistoryPage() {
  const [history, setHistory] = useState<EmailSendLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.email.sendHistory().then(setHistory).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <div className="mb-5">
        <h1 className="text-2xl text-warm-brown">Send History</h1>
        <p className="text-sm text-warm-clay">Every email sent, automatic or admin-triggered.</p>
      </div>

      <div className="overflow-x-auto rounded-spotly border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-warm-clay">
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Sent By</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-warm-clay">Loading…</td></tr>
            )}
            {!loading && history.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-warm-clay">No sends yet.</td></tr>
            )}
            {history.map((h) => (
              <tr key={h.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{h.templateName}</td>
                <td className="px-4 py-3 text-warm-clay">{h.subject}</td>
                {/* Null only on the handful of rows that predate this
                    column — those fall back to the aggregate count
                    rather than a blank cell. */}
                <td className="px-4 py-3">{h.recipientEmail ?? `${h.recipientCount} recipients`}</td>
                {/* Genuinely blank now when this send isn't tied to a
                    registered business — no more raw emails leaking
                    into this column as a workaround. */}
                <td className="px-4 py-3">{h.businessName ?? "—"}</td>
                {/* null = an automatic system send (signup, first-photo
                    approval) rather than an admin clicking "Send" —
                    see EmailService.logAutomaticSend. */}
                <td className="px-4 py-3">{h.sentByAdminId ? "Admin" : "System"}</td>
                <td className="px-4 py-3 text-xs text-warm-clay">{new Date(h.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
