"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, type EmailTemplate, type EmailSendLog, type BusinessFilters } from "@/lib/api";

type View = "list" | "edit" | "send" | "outreach";

export default function EmailsPage() {
  const [view, setView] = useState<View>("list");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [history, setHistory] = useState<EmailSendLog[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [sending, setSending] = useState<EmailTemplate | null>(null);

  const load = () => {
    api.email.listTemplates().then(setTemplates).catch(() => {});
    api.email.sendHistory().then(setHistory).catch(() => {});
  };
  useEffect(load, []);

  if (view === "edit") {
    return (
      <AdminShell>
        <TemplateEditor
          template={editing}
          onCancel={() => setView("list")}
          onSaved={() => { setView("list"); load(); }}
        />
      </AdminShell>
    );
  }

  if (view === "send" && sending) {
    return (
      <AdminShell>
        <SendFlow template={sending} onCancel={() => setView("list")} onSent={() => { setView("list"); load(); }} />
      </AdminShell>
    );
  }

  if (view === "outreach") {
    return (
      <AdminShell>
        <OutreachFlow templates={templates} onCancel={() => setView("list")} onSent={() => { setView("list"); load(); }} />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-warm-brown">Email Templates</h1>
          <p className="text-sm text-warm-clay">Reusable templates for reward offers and announcements.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setView("outreach")}
            className="rounded-full border border-terracotta px-4 py-2.5 text-sm font-semibold text-terracotta"
          >
            <i className="bi bi-send mr-1.5" /> Outreach email
          </button>
          <button
            onClick={() => { setEditing(null); setView("edit"); }}
            className="rounded-full bg-terracotta px-4 py-2.5 text-sm font-semibold text-white"
          >
            <i className="bi bi-plus-lg mr-1.5" /> New template
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 && (
          <p className="col-span-full rounded-spotly border border-border bg-surface p-8 text-center text-warm-clay">
            No templates yet — create one to start sending reward offers or announcements.
          </p>
        )}
        {templates.map((t) => (
          <div key={t.id} className="rounded-spotly border border-border bg-surface p-4">
            <h3 className="mb-1 font-semibold text-warm-brown">{t.name}</h3>
            <p className="mb-3 truncate text-sm text-warm-clay">{t.subject}</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => { setSending(t); setView("send"); }}
                className="flex-1 rounded-full bg-olive py-1.5 text-xs font-semibold text-white"
              >
                Send
              </button>
              <button
                onClick={() => { setEditing(t); setView("edit"); }}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-cream"
              >
                Edit
              </button>
              <button
                onClick={() => api.email.deleteTemplate(t.id).then(load).catch(() => {})}
                className="rounded-full border border-error px-3 py-1.5 text-xs font-semibold text-error hover:bg-[rgba(214,90,74,0.08)]"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg text-warm-brown">Send History</h2>
      <div className="overflow-x-auto rounded-spotly border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-warm-clay">
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Subject (rendered)</th>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Sent By</th>
              <th className="px-4 py-3">Sent</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-warm-clay">No sends yet.</td></tr>
            )}
            {history.map((h) => (
              <tr key={h.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{h.templateName}</td>
                <td className="px-4 py-3 text-warm-clay">{h.subject}</td>
                {/* businessName is only null on the couple of rows
                    logged before this column existed — those still show
                    their original aggregate count instead, rather than
                    a blank cell. */}
                <td className="px-4 py-3">{h.businessName ?? `${h.recipientCount} recipients`}</td>
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

function TemplateEditor({ template, onCancel, onSaved }: { template: EmailTemplate | null; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (template) await api.email.updateTemplate(template.id, { name, subject, body });
      else await api.email.createTemplate({ name, subject, body });
      onSaved();
    } catch {
      // see SuspendModal's submit() in businesses/page.tsx
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-2xl text-warm-brown">{template ? "Edit template" : "New template"}</h1>
      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold text-warm-clay">Name (internal label)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-border bg-cream px-3 py-2.5 text-sm outline-none focus:border-terracotta" />
      </label>
      <label className="mb-4 block">
        <span className="mb-1 block text-xs font-semibold text-warm-clay">Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-border bg-cream px-3 py-2.5 text-sm outline-none focus:border-terracotta" placeholder="A special offer for {{businessName}}" />
      </label>
      <label className="mb-2 block">
        <span className="mb-1 block text-xs font-semibold text-warm-clay">Body (HTML)</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="w-full rounded-xl border border-border bg-cream px-3 py-2.5 font-mono text-xs outline-none focus:border-terracotta" placeholder="<p>Hi {{ownerName}}, ...</p>" />
      </label>
      <p className="mb-6 text-xs text-warm-clay">
        Available variables: <code>{"{{businessName}}"}</code> <code>{"{{ownerName}}"}</code> <code>{"{{city}}"}</code>{" "}
        <code>{"{{category}}"}</code> <code>{"{{tier}}"}</code> <code>{"{{discountPercent}}"}</code>
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold">Cancel</button>
        <button onClick={save} disabled={busy || !name || !subject || !body} className="flex-1 rounded-full bg-terracotta py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Saving…" : "Save template"}
        </button>
      </div>
    </div>
  );
}

function SendFlow({ template, onCancel, onSent }: { template: EmailTemplate; onCancel: () => void; onSent: () => void }) {
  const [filters, setFilters] = useState<BusinessFilters>({});
  const [preview, setPreview] = useState<{ matchCount: number; usingSampleData: boolean; subject: string; body: string; sampleBusiness: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ queued: number; totalMatched: number } | null>(null);

  const runPreview = () => api.email.preview(template.subject, template.body, filters).then(setPreview).catch(() => {});
  useEffect(() => { runPreview(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy(true);
    try {
      const res = await api.email.send({ templateId: template.id, filters });
      setResult(res);
    } catch {
      // see SuspendModal's submit() in businesses/page.tsx
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl text-warm-brown">Send &quot;{template.name}&quot;</h1>
      <p className="mb-5 text-sm text-warm-clay">Set who receives this, same filter logic as the Businesses table.</p>

      {result ? (
        <div className="rounded-spotly border border-border bg-surface p-6 text-center">
          <i className="bi bi-check-circle mb-2 block text-3xl text-success" />
          <p className="mb-4 text-sm">Queued {result.queued} of {result.totalMatched} matching businesses.</p>
          <button onClick={onSent} className="rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-white">Done</button>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-spotly border border-border bg-surface p-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-warm-clay">City</span>
              <input onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value || undefined }))} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-warm-clay">Category</span>
              <input onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-warm-clay">Min profile views</span>
              <input type="number" onChange={(e) => setFilters((f) => ({ ...f, minProfileViews: e.target.value ? Number(e.target.value) : undefined }))} className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta" />
            </label>
            <button onClick={runPreview} className="col-span-full rounded-full border border-terracotta py-2 text-sm font-semibold text-terracotta">
              Update preview
            </button>
          </div>

          {preview && (
            <div className="mb-6 rounded-spotly border border-border bg-surface p-5">
              <p className="mb-3 text-sm font-semibold text-warm-clay">
                {preview.matchCount} business{preview.matchCount === 1 ? "" : "es"} match
                {preview.usingSampleData && " — showing sample data below since none match yet"}
              </p>
              <div className="rounded-xl border border-border bg-cream p-4">
                <p className="mb-2 text-sm font-semibold">{preview.subject}</p>
                <div className="text-sm text-text" dangerouslySetInnerHTML={{ __html: preview.body }} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold">Cancel</button>
            <button
              onClick={send}
              disabled={busy || !preview || preview.matchCount === 0}
              className="flex-1 rounded-full bg-olive py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Sending…" : `Send to ${preview?.matchCount ?? 0} businesses`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// For people who aren't businesses in the system yet — a prospect who
// hasn't signed up — so there's no filter to run, just a manually-typed
// recipient list (Val, Sep 2026). Picking an existing template prefills
// subject/body (still editable); {{variable}} tokens in that copy have
// no business to substitute against here and are left blank, same as
// the backend does.
function OutreachFlow({
  templates,
  onCancel,
  onSent,
}: {
  templates: EmailTemplate[];
  onCancel: () => void;
  onSent: () => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ queued: number } | null>(null);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  };

  const emails = emailsText
    .split(/[\n,]/)
    .map((e) => e.trim())
    .filter(Boolean);

  const send = async () => {
    if (!subject || !body) {
      setError("Subject and body are both required.");
      return;
    }
    if (emails.length === 0) {
      setError("Add at least one recipient email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.email.sendManual({ subject, body, emails });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl text-warm-brown">Outreach email</h1>
      <p className="mb-5 text-sm text-warm-clay">Send directly to email addresses that aren&apos;t in the system as businesses yet.</p>

      {result ? (
        <div className="rounded-spotly border border-border bg-surface p-6 text-center">
          <i className="bi bi-check-circle mb-2 block text-3xl text-success" />
          <p className="mb-4 text-sm">Sent to {result.queued} recipient{result.queued === 1 ? "" : "s"}.</p>
          <button onClick={onSent} className="rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-white">Done</button>
        </div>
      ) : (
        <>
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold text-warm-clay">Start from a template (optional)</span>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
            >
              <option value="">Write from scratch</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold text-warm-clay">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold text-warm-clay">Body (HTML)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 font-mono text-xs outline-none focus:border-terracotta"
            />
          </label>

          <label className="mb-2 block">
            <span className="mb-1 block text-xs font-semibold text-warm-clay">Recipient emails</span>
            <textarea
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              rows={4}
              placeholder="one@example.com, another@example.com&#10;or one per line"
              className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
            />
          </label>
          <p className="mb-5 text-xs text-warm-clay">
            {emails.length} recipient{emails.length === 1 ? "" : "s"} detected
          </p>

          {error && <p className="mb-4 text-sm text-error">{error}</p>}

          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold">Cancel</button>
            <button
              onClick={send}
              disabled={busy || emails.length === 0}
              className="flex-1 rounded-full bg-olive py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Sending…" : `Send to ${emails.length || 0} recipient${emails.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
