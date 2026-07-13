'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dateKey, fmtDateHuman, pad, todayDateOnly } from '@/lib/calendar-helpers';
import type { Reservation } from '@/lib/types';

type Filter = 'upcoming' | 'past' | 'all';

export default function AdminDashboard() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; wholeSeries: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  function loadReservations() {
    setLoading(true);
    fetch('/api/admin/reservations')
      .then((res) => {
        if (res.status === 401) {
          router.refresh();
          return { reservations: [] };
        }
        return res.json();
      })
      .then((data) => setReservations(data.reservations || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  async function executeDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({ id: pendingDelete.id });
      if (pendingDelete.wholeSeries) params.set('series', '1');
      const res = await fetch(`/api/admin/reservations?${params.toString()}`, { method: 'DELETE' });
      if (res.ok) {
        setPendingDelete(null);
        loadReservations();
      }
    } finally {
      setDeleting(false);
    }
  }

  const todayKey = useMemo(() => {
    const t = todayDateOnly();
    return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const filtered = useMemo(() => {
    let list = [...reservations].sort((a, b) =>
      (a.date + pad(a.start_hour)).localeCompare(b.date + pad(b.start_hour))
    );
    if (filter === 'upcoming') list = list.filter((r) => r.date >= todayKey);
    if (filter === 'past') list = list.filter((r) => r.date < todayKey);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [reservations, filter, search, todayKey]);

  return (
    <div className="wrap">
      <div className="lede">
        <h2>Správa rezervací</h2>
        <button className="btn btn-sm btn-ghost" onClick={handleLogout}>Odhlásit se</button>
      </div>

      <div className="filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="upcoming">Budoucí rezervace</option>
          <option value="past">Minulé rezervace</option>
          <option value="all">Všechny</option>
        </select>
        <input
          placeholder="Hledat jméno, telefon, e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="hint">Načítám rezervace…</div>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="brand-mark" style={{ opacity: 0.5 }}>K</div>
          <p>V tomto výběru nejsou žádné rezervace.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="res-list">
          {filtered.map((r) => (
            <div className="res-row" key={r.id}>
              <div className="res-info">
                <div className="res-when">
                  {fmtDateHuman(r.date)} · {pad(r.start_hour)}:00–{pad(r.end_hour)}:00{' '}
                  {r.recurrence_id && <span className="res-badge">opakovaná</span>}
                </div>
                <div className="res-who">
                  {r.name} · {r.phone} · {r.email} · {r.purpose}
                </div>
              </div>
              <div className="res-actions">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setPendingDelete({ id: r.id, wholeSeries: false })}
                >
                  Smazat
                </button>
                {r.recurrence_id && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setPendingDelete({ id: r.id, wholeSeries: true })}
                  >
                    Smazat celou sérii
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="overlay show">
          <div className="modal">
            <h3>Potvrzení smazání</h3>
            <div className="sub">
              {pendingDelete.wholeSeries
                ? 'Smazat celou sérii opakovaných rezervací? Tuto akci nelze vrátit.'
                : 'Smazat tuto rezervaci? Tuto akci nelze vrátit.'}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
                Zrušit
              </button>
              <button className="btn btn-danger" onClick={executeDelete} disabled={deleting}>
                {deleting ? 'Mažu…' : 'Smazat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
