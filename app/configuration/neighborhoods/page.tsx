"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { api, type AdminNeighborhood } from "@/lib/api";

export default function NeighborhoodsConfigPage() {
  const [neighborhoods, setNeighborhoods] = useState<AdminNeighborhood[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api.config.neighborhoods
      .list()
      .then(setNeighborhoods)
      .catch(() => setError("Couldn't load neighborhoods."));
  };
  useEffect(load, []);

  // Grouped by city — the API already returns them sorted city-then-name,
  // so this just buckets what's already in order rather than re-sorting.
  const byCity = useMemo(() => {
    const groups = new Map<string, AdminNeighborhood[]>();
    for (const n of neighborhoods ?? []) {
      const key = n.city?.trim() || "No city set";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(n);
    }
    return Array.from(groups.entries());
  }, [neighborhoods]);

  const existingCities = useMemo(
    () => Array.from(new Set((neighborhoods ?? []).map((n) => n.city).filter((c): c is string => !!c))),
    [neighborhoods],
  );

  return (
    <AdminShell>
      <div className="mb-5">
        <h1 className="text-2xl text-warm-brown">Neighborhoods</h1>
        <p className="text-sm text-warm-clay">
          Launch neighborhoods businesses can select and consumers can filter by, grouped by city.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      <AddNeighborhoodBar existingCities={existingCities} onAdded={load} />

      {!neighborhoods ? (
        <p className="mt-6 text-sm text-warm-clay">Loading…</p>
      ) : neighborhoods.length === 0 ? (
        <p className="mt-6 text-sm text-warm-clay">No neighborhoods yet — add the first one above.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {byCity.map(([city, list]) => (
            <CityGroup key={city} city={city} neighborhoods={list} onChanged={load} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

// ============================================================
// Add bar — a single inline form up top, not its own bordered card.
// "Adding a city" isn't a separate action: city is just a field on a
// neighborhood, so typing a new one into this same form is how a new
// city group comes into existence.
// ============================================================

function AddNeighborhoodBar({ existingCities, onAdded }: { existingCities: string[]; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState(existingCities[0] || "");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city && existingCities.length > 0) setCity(existingCities[0]);
  }, [existingCities, city]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.config.neighborhoods.create({ name: name.trim(), city: city.trim() || undefined });
      setName("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that neighborhood.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-spotly border border-border bg-surface p-4">
      <label className="block flex-1 basis-52">
        <span className="mb-1 block text-xs font-semibold text-warm-clay">Neighborhood name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="e.g. Kileleshwa"
          className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
        />
      </label>
      <label className="block flex-1 basis-52">
        <span className="mb-1 block text-xs font-semibold text-warm-clay">City</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          list="existing-cities"
          placeholder="e.g. Nairobi"
          className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-terracotta"
        />
        <datalist id="existing-cities">
          {existingCities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <button
        onClick={handleAdd}
        disabled={adding || !name.trim()}
        className="rounded-full bg-terracotta px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {adding ? "Adding…" : "Add"}
      </button>
      {error && <p className="w-full text-xs text-error">{error}</p>}
    </div>
  );
}

// ============================================================
// One city's card — its neighborhoods as a wrapped list of rows, each
// with edit/hide/delete revealed on hover rather than shown up front.
// ============================================================

function CityGroup({ city, neighborhoods, onChanged }: { city: string; neighborhoods: AdminNeighborhood[]; onChanged: () => void }) {
  return (
    <div className="rounded-spotly border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-warm-brown">{city}</h2>
        <span className="text-xs text-warm-clay">{neighborhoods.length}</span>
      </div>
      <div className="space-y-0.5">
        {neighborhoods.map((n) => (
          <NeighborhoodRow key={n.id} neighborhood={n} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}

function NeighborhoodRow({ neighborhood, onChanged }: { neighborhood: AdminNeighborhood; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(neighborhood.name);
  const [city, setCity] = useState(neighborhood.city || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.config.neighborhoods.update(neighborhood.id, { name: name.trim(), city: city.trim() || undefined });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleHidden = async () => {
    setBusy(true);
    try {
      await api.config.neighborhoods.update(neighborhood.id, { isHidden: !neighborhood.isHidden });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${neighborhood.name}"? Businesses already set to it keep the value, but it won't be offered as an option anymore.`)) return;
    setBusy(true);
    try {
      await api.config.neighborhoods.remove(neighborhood.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that.");
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-1.5 rounded-lg bg-cream p-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-2.5 py-1 text-sm outline-none focus:border-terracotta" placeholder="Name" />
        <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-2.5 py-1 text-sm outline-none focus:border-terracotta" placeholder="City" />
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
    <div className="group flex items-center justify-between rounded-lg px-2 py-1.5 transition hover:bg-cream">
      <button onClick={() => setEditing(true)} className={`truncate text-left text-sm ${neighborhood.isHidden ? "text-warm-clay line-through" : "text-text"}`}>
        {neighborhood.name}
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          onClick={handleToggleHidden}
          disabled={busy}
          title={neighborhood.isHidden ? "Unhide" : "Hide"}
          className="flex h-6 w-6 items-center justify-center rounded-full text-warm-clay hover:bg-border hover:text-text"
        >
          <i className={`bi ${neighborhood.isHidden ? "bi-eye-slash" : "bi-eye"} text-xs`} />
        </button>
        <button
          onClick={() => setEditing(true)}
          disabled={busy}
          title="Edit"
          className="flex h-6 w-6 items-center justify-center rounded-full text-warm-clay hover:bg-border hover:text-text"
        >
          <i className="bi bi-pencil text-xs" />
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          title="Delete"
          className="flex h-6 w-6 items-center justify-center rounded-full text-error hover:bg-border"
        >
          <i className="bi bi-trash text-xs" />
        </button>
      </div>
    </div>
  );
}
