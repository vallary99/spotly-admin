"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, type AdminCategory } from "@/lib/api";

export default function CategoriesConfigPage() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api.config.categories
      .list()
      .then(setCategories)
      .catch(() => setError("Couldn't load categories."));
  };
  useEffect(load, []);

  return (
    <AdminShell>
      <div className="mb-5">
        <h1 className="text-2xl text-warm-brown">Categories</h1>
        <p className="text-sm text-warm-clay">
          Business categories, used at onboarding and as filters.
        </p>
      </div>

      {/* Max-per-business is a single number, not a whole card's worth
          of content — a slim inline row up top rather than competing
          for column width with the categories list below it. */}
      <MaxCategoriesBar />

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      <div className="mt-6">
        {!categories ? (
          <p className="text-sm text-warm-clay">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-warm-clay">No categories yet — add the first one below.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <CategoryChip key={c.id} category={c} onChanged={load} />
            ))}
          </div>
        )}
      </div>

      <AddCategoryBar onAdded={load} />
    </AdminShell>
  );
}

// ============================================================
// Max categories per business — one number, one save button, one line.
// ============================================================

function MaxCategoriesBar() {
  const [value, setValue] = useState<string>("");
  const [saved, setSaved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api.config.settings
      .getMaxCategories()
      .then((res) => {
        setValue(String(res.maxCategories));
        setSaved(res.maxCategories);
      })
      .catch(() => setError("Couldn't load this setting."));
  };
  useEffect(load, []);

  const handleSave = async () => {
    const num = parseInt(value, 10);
    if (!Number.isFinite(num) || num < 1) {
      setError("Enter a whole number of 1 or more.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.config.settings.setMaxCategories(num);
      setValue(String(res.maxCategories));
      setSaved(res.maxCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-spotly border border-border bg-surface px-4 py-3">
      <span className="text-sm font-medium text-text">Categories per business</span>
      <input
        type="number"
        min={1}
        max={50}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="w-20 rounded-lg border border-border bg-cream px-3 py-1.5 text-sm outline-none focus:border-terracotta"
      />
      <button
        onClick={handleSave}
        disabled={busy || value === "" || Number(value) === saved}
        className="rounded-full bg-terracotta px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {saved != null && Number(value) === saved && !busy && (
        <span className="text-xs text-warm-clay">
          <i className="bi bi-check-circle mr-1" /> Currently {saved}
        </span>
      )}
      {error && <span className="text-xs text-error">{error}</span>}
      <span className="ml-auto text-xs text-warm-clay">Enforced server-side, not just in the form.</span>
    </div>
  );
}

// ============================================================
// Category chip — hover reveals edit/delete rather than showing them
// up front; click the chip itself (or the pencil) to edit inline.
// ============================================================

function CategoryChip({ category, onChanged }: { category: AdminCategory; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.config.categories.update(category.id, { name: name.trim(), description: description.trim() || undefined });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete category "${category.name}"? Businesses already using it keep it, but it won't show up as an option or be filterable anymore.`)) return;
    setBusy(true);
    try {
      await api.config.categories.remove(category.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that.");
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="w-64 space-y-1.5 rounded-xl border border-terracotta bg-surface p-2.5">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-cream px-2.5 py-1 text-sm outline-none focus:border-terracotta" placeholder="Name" />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-border bg-cream px-2.5 py-1 text-sm outline-none focus:border-terracotta"
          placeholder="Description (optional)"
        />
        {error && <p className="text-[0.7rem] text-error">{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={busy} className="rounded-full bg-terracotta px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-warm-clay">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-1 rounded-full border border-border bg-surface py-1.5 pl-3.5 pr-1.5 text-sm transition hover:border-terracotta"
      title={category.description || undefined}
    >
      <button onClick={() => setEditing(true)} className="text-text">
        {category.name}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <button onClick={() => setEditing(true)} title="Edit" className="flex h-6 w-6 items-center justify-center rounded-full text-warm-clay hover:bg-cream hover:text-text">
          <i className="bi bi-pencil text-[0.7rem]" />
        </button>
        <button onClick={handleDelete} disabled={busy} title="Delete" className="flex h-6 w-6 items-center justify-center rounded-full text-error hover:bg-cream">
          <i className="bi bi-trash text-[0.7rem]" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Add — a slim inline bar under the chip grid, not a bordered card.
// ============================================================

function AddCategoryBar({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.config.categories.create({ name: name.trim(), description: description.trim() || undefined });
      setName("");
      setDescription("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that category.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
      <label className="block flex-1 basis-52">
        <span className="mb-1 block text-xs font-semibold text-warm-clay">New category name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
        />
      </label>
      <label className="block flex-1 basis-52">
        <span className="mb-1 block text-xs font-semibold text-warm-clay">Description (optional)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
        />
      </label>
      <button
        onClick={handleAdd}
        disabled={adding || !name.trim()}
        className="rounded-full bg-terracotta px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {adding ? "Adding…" : "Add category"}
      </button>
      {error && <p className="w-full text-xs text-error">{error}</p>}
    </div>
  );
}
