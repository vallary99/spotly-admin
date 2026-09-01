"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, tierLabel, type TierLimit } from "@/lib/api";

// Fixed display order — STARTER (Free) first, then the two paid tiers
// in ascending price. The API returns tier-configs as a plain object
// keyed by enum value with no guaranteed order, so this is deliberate,
// not incidental.
const TIER_ORDER = ["STARTER", "GROWTH", "PREMIUM"];

export default function ConfigurationPage() {
  const [tiers, setTiers] = useState<Record<string, TierLimit> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    api.tierConfigs
      .list()
      .then(setTiers)
      .catch(() => setLoadError("Couldn't load package configuration."));
  };
  useEffect(load, []);

  return (
    <AdminShell>
      <div className="mb-5">
        <h1 className="text-2xl text-warm-brown">Pricing &amp; Tiers</h1>
        <p className="text-sm text-warm-clay">
          Package pricing and limits. Changes take effect immediately for every business on that tier — this isn&apos;t
          a draft/publish flow.
        </p>
      </div>

      {loadError && <p className="mb-4 text-sm text-error">{loadError}</p>}

      {!tiers ? (
        <p className="text-warm-clay">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {TIER_ORDER.filter((t) => tiers[t]).map((tier) => (
            <TierCard key={tier} tier={tier} limit={tiers[tier]} onSaved={load} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function TierCard({ tier, limit, onSaved }: { tier: string; limit: TierLimit; onSaved: () => void }) {
  const [form, setForm] = useState(toFormState(limit));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Re-sync if the parent reloads (e.g. after this same card's own save
  // triggers a refetch) — without this, the card would keep showing
  // possibly-stale locally-typed values instead of confirmed-persisted
  // ones.
  useEffect(() => setForm(toFormState(limit)), [limit]);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const dto = fromFormState(form);
      await api.tierConfigs.update(tier, dto);
      setSavedAt(Date.now());
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-spotly border border-border bg-surface p-5">
      <h2 className="mb-1 text-lg text-warm-brown">{tierLabel(tier)}</h2>
      <p className="mb-4 text-xs text-warm-clay">Internal id: {tier}</p>

      <div className="space-y-3">
        <Field label="Price (KES/month)">
          <input
            type="number"
            min={0}
            value={form.priceKes}
            onChange={(e) => setForm({ ...form, priceKes: e.target.value })}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Photos">
            <input
              type="number"
              min={0}
              value={form.photos}
              onChange={(e) => setForm({ ...form, photos: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Videos">
            <input
              type="number"
              min={0}
              value={form.videos}
              onChange={(e) => setForm({ ...form, videos: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Max video length (seconds)">
          <input
            type="number"
            min={0}
            value={form.videoMaxSeconds}
            onChange={(e) => setForm({ ...form, videoMaxSeconds: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Concurrent live experiences" hint="Blank = no live cap (uses the monthly allowance below instead)">
          <input
            type="number"
            min={0}
            value={form.concurrentExperiences}
            onChange={(e) => setForm({ ...form, concurrentExperiences: e.target.value })}
            placeholder="No cap"
            className={inputClass}
          />
        </Field>

        <Field label="Experiences included / month" hint="Blank = not monthly-limited (uses the concurrent cap above instead)">
          <input
            type="number"
            min={0}
            value={form.monthlyExperiencesIncluded}
            onChange={(e) => setForm({ ...form, monthlyExperiencesIncluded: e.target.value })}
            placeholder="No monthly cap"
            className={inputClass}
          />
        </Field>

        <Field label="Per-event add-on price (KES)" hint="Charged for an experience beyond what's included above">
          <input
            type="number"
            min={0}
            value={form.experienceAddonPriceKes}
            onChange={(e) => setForm({ ...form, experienceAddonPriceKes: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Extra features" hint="One per line — shown as bullet points on the package card">
          <textarea
            value={form.extraFeatures}
            onChange={(e) => setForm({ ...form, extraFeatures: e.target.value })}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </Field>
      </div>

      {error && <p className="mt-3 text-xs text-error">{error}</p>}

      <button
        onClick={handleSave}
        disabled={busy}
        className="mt-4 w-full rounded-full bg-terracotta py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
      {savedAt && !busy && !error && (
        <p className="mt-2 text-center text-xs text-warm-clay">
          <i className="bi bi-check-circle mr-1" /> Saved
        </p>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-warm-clay">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] text-warm-clay">{hint}</span>}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-border bg-cream px-3.5 py-2 text-sm outline-none focus:border-terracotta";

// Everything is a controlled text input (including the nullable
// number fields), so form state is all strings — converted to/from the
// real TierLimit shape at the edges (toFormState/fromFormState) rather
// than juggling number|null mid-typing, which fights React controlled
// inputs (e.g. can't represent "the field is currently empty because
// they're mid-typing a new number" as a number).
type TierForm = {
  priceKes: string;
  photos: string;
  videos: string;
  videoMaxSeconds: string;
  concurrentExperiences: string;
  monthlyExperiencesIncluded: string;
  experienceAddonPriceKes: string;
  extraFeatures: string;
};

function toFormState(limit: TierLimit): TierForm {
  return {
    priceKes: String(limit.priceKes),
    photos: String(limit.photos),
    videos: String(limit.videos),
    videoMaxSeconds: String(limit.videoMaxSeconds),
    concurrentExperiences: limit.concurrentExperiences === null ? "" : String(limit.concurrentExperiences),
    monthlyExperiencesIncluded: limit.monthlyExperiencesIncluded === null ? "" : String(limit.monthlyExperiencesIncluded),
    experienceAddonPriceKes: String(limit.experienceAddonPriceKes ?? 0),
    extraFeatures: (limit.extraFeatures ?? []).join("\n"),
  };
}

function fromFormState(form: TierForm): Partial<TierLimit> {
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  return {
    priceKes: num(form.priceKes) ?? 0,
    photos: num(form.photos) ?? 0,
    videos: num(form.videos) ?? 0,
    videoMaxSeconds: num(form.videoMaxSeconds) ?? 0,
    concurrentExperiences: num(form.concurrentExperiences),
    monthlyExperiencesIncluded: num(form.monthlyExperiencesIncluded),
    experienceAddonPriceKes: num(form.experienceAddonPriceKes) ?? 0,
    extraFeatures: form.extraFeatures
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
