"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, type AdminCategory, type AdminQuickFilterGroup } from "@/lib/api";

const rowInputClass =
  "w-full rounded-lg border border-border bg-cream px-3 py-1.5 text-sm outline-none focus:border-terracotta";

export default function QuickFiltersConfigPage() {
  const [groups, setGroups] = useState<AdminQuickFilterGroup[] | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingOpen, setAddingOpen] = useState(false);

  const load = () => {
    setError(null);
    Promise.all([api.config.quickFilterGroups.list(), api.config.categories.list()])
      .then(([g, c]) => {
        setGroups(g);
        setCategories(c);
      })
      .catch(() => setError("Couldn't load quick filter groups."));
  };
  useEffect(load, []);

  const handleDelete = async (g: AdminQuickFilterGroup) => {
    if (!window.confirm(`Delete the "${g.label}" quick filter? It'll disappear from the homepage's quick-filter chips.`)) return;
    setError(null);
    try {
      await api.config.quickFilterGroups.remove(g.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that filter group.");
    }
  };

  const sorted = (groups ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <AdminShell>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-warm-brown">Quick Filters</h1>
          <p className="text-sm text-warm-clay">
            The homepage&apos;s quick-filter chips. Each maps to one or more categories — a category can belong to
            more than one group.
          </p>
        </div>
        <button
          onClick={() => setAddingOpen((v) => !v)}
          className="shrink-0 rounded-full bg-terracotta px-4 py-2 text-sm font-semibold text-white"
        >
          <i className="bi bi-plus-lg mr-1" /> Add
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      {addingOpen && (
        <div className="mb-5">
          <AddGroupForm
            allCategories={categories}
            onAdded={() => {
              setAddingOpen(false);
              load();
            }}
            onCancel={() => setAddingOpen(false)}
          />
        </div>
      )}

      {!groups ? (
        <p className="text-sm text-warm-clay">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-warm-clay">No quick filter groups yet — add the first one above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {sorted.map((g) =>
            expandedId === g.id ? (
              <div key={g.id} className="col-span-full">
                <QuickFilterGroupEditor
                  group={g}
                  allCategories={categories}
                  onClose={() => setExpandedId(null)}
                  onDeleted={() => handleDelete(g)}
                  onSaved={load}
                />
              </div>
            ) : (
              <QuickFilterTile key={g.id} group={g} onOpen={() => setExpandedId(g.id)} onDelete={() => handleDelete(g)} />
            ),
          )}
        </div>
      )}
    </AdminShell>
  );
}

// ============================================================
// Compact tile — the resting state of a group in the 6-column grid.
// Hover reveals a delete affordance in the corner; clicking anywhere
// else on the tile expands it to full width for editing.
// ============================================================

function QuickFilterTile({ group, onOpen, onDelete }: { group: AdminQuickFilterGroup; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="group relative rounded-spotly border border-border bg-surface p-3.5 text-left transition hover:border-terracotta">
      <button onClick={onDelete} title="Delete" className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-error opacity-0 transition hover:bg-cream group-hover:opacity-100">
        <i className="bi bi-trash text-[0.7rem]" />
      </button>
      <button onClick={onOpen} className="block w-full text-left">
        {group.icon && <i className={`bi ${group.icon} mb-1.5 block text-lg text-terracotta`} />}
        <span className="block truncate text-sm font-semibold text-text">{group.label}</span>
        <span className="mt-0.5 block text-xs text-warm-clay">
          {group.categories.length} categor{group.categories.length === 1 ? "y" : "ies"}
        </span>
      </button>
    </div>
  );
}

// ============================================================
// Expanded editor — spans the full grid width (col-span-full) so
// opening one tile never distorts the others' sizing.
// ============================================================

function QuickFilterGroupEditor({
  group,
  allCategories,
  onClose,
  onDeleted,
  onSaved,
}: {
  group: AdminQuickFilterGroup;
  allCategories: AdminCategory[];
  onClose: () => void;
  onDeleted: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(group.label);
  const [icon, setIcon] = useState(group.icon || "");
  const [categoryIds, setCategoryIds] = useState<string[]>(group.categories.map((c) => c.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.config.quickFilterGroups.update(group.id, { label: label.trim(), icon: icon.trim() || undefined, categoryIds });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-spotly border border-terracotta bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-warm-brown">Edit quick filter</h2>
        <div className="flex items-center gap-2">
          <button onClick={onDeleted} className="flex h-7 w-7 items-center justify-center rounded-full text-error hover:bg-cream" title="Delete">
            <i className="bi bi-trash text-xs" />
          </button>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-warm-clay hover:bg-cream" title="Close">
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={rowInputClass} placeholder="Label" />
        <input value={icon} onChange={(e) => setIcon(e.target.value)} className={rowInputClass} placeholder="Bootstrap icon" />
      </div>
      <div className="mt-3">
        <CategoryMultiSelect allCategories={allCategories} selectedIds={categoryIds} onChange={setCategoryIds} />
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      <button
        onClick={handleSave}
        disabled={busy}
        className="mt-3 rounded-full bg-terracotta px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function AddGroupForm({
  allCategories,
  onAdded,
  onCancel,
}: {
  allCategories: AdminCategory[];
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!label.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.config.quickFilterGroups.create({ label: label.trim(), icon: icon.trim() || undefined, categoryIds });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that filter group.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-spotly border border-border bg-surface p-5">
      <div className="grid grid-cols-2 gap-3">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={rowInputClass} placeholder="Label, e.g. Adrenaline Boost" />
        <input value={icon} onChange={(e) => setIcon(e.target.value)} className={rowInputClass} placeholder="Bootstrap icon, e.g. bi-lightning-charge" />
      </div>
      <div className="mt-3">
        <CategoryMultiSelect allCategories={allCategories} selectedIds={categoryIds} onChange={setCategoryIds} />
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleAdd}
          disabled={adding || !label.trim()}
          className="rounded-full bg-terracotta px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add quick filter group"}
        </button>
        <button onClick={onCancel} className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-warm-clay">
          Cancel
        </button>
      </div>
    </div>
  );
}

// A category can belong to more than one quick filter group, so this is
// deliberately a checklist (toggle membership), not a single-select —
// picking "Nightlife" here doesn't remove a category from "Adrenaline
// Boost" if it's already mapped there too.
function CategoryMultiSelect({
  allCategories,
  selectedIds,
  onChange,
}: {
  allCategories: AdminCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  if (allCategories.length === 0) {
    return <p className="text-xs text-warm-clay">Add a category first, then map it here.</p>;
  }

  return (
    <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-cream p-2">
      <div className="flex flex-wrap gap-1.5">
        {allCategories.map((c) => {
          const active = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`rounded-full border px-2.5 py-1 text-[0.72rem] font-medium transition ${
                active ? "border-terracotta bg-terracotta text-white" : "border-border bg-surface text-warm-clay hover:border-terracotta"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
