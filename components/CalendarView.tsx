'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DOW,
  MONTHS,
  dateKey,
  fmtDateHuman,
  hourSlots,
  isWithinRange,
  pad,
  todayDateOnly,
} from '@/lib/calendar-helpers';
import type { AvailabilitySlot } from '@/lib/types';
import ReservationModal from './ReservationModal';

export default function CalendarView() {
  const today = useMemo(() => todayDateOnly(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalHour, setModalHour] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/availability?year=${calYear}&month=${calMonth + 1}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots || []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [calYear, calMonth, refreshKey]);

  function slotsOnDate(key: string) {
    return slots.filter((s) => s.date === key);
  }
  function isHourBusy(key: string, hour: number) {
    return slotsOnDate(key).some((s) => hour >= s.start_hour && hour < s.end_hour);
  }
  function dayInfo(key: string) {
    const list = slotsOnDate(key);
    const total = hourSlots().length;
    const busyCount = list.reduce((a, s) => a + (s.end_hour - s.start_hour), 0);
    return { hasBusy: list.length > 0, total, busyCount };
  }

  function changeMonth(delta: number) {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCalMonth(m);
    setCalYear(y);
    setSelectedDate(null);
  }

  const firstOfMonth = new Date(calYear, calMonth, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthLabel = `${MONTHS[calMonth]} ${calYear}`;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-day empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(calYear, calMonth, d);
    dateObj.setHours(0, 0, 0, 0);
    const key = dateKey(calYear, calMonth, d);
    const inRange = isWithinRange(dateObj);
    const isToday = dateObj.getTime() === today.getTime();
    const isSelected = key === selectedDate;
    const info = dayInfo(key);

    cells.push(
      <button
        key={key}
        type="button"
        disabled={!inRange}
        onClick={() => setSelectedDate(key)}
        className={[
          'cal-day',
          isToday ? 'today' : '',
          isSelected ? 'selected' : '',
          !inRange ? 'disabled' : '',
        ].join(' ')}
      >
        {info.hasBusy && <span className="ind busy" aria-hidden="true" />}
        <span className="num">{d}</span>
      </button>
    );
  }

  const slotList = selectedDate ? hourSlots() : [];
  const dateObjForSelected = selectedDate ? new Date(selectedDate) : null;
  const isSelectedToday =
    selectedDate &&
    new Date(selectedDate + 'T00:00:00').getTime() === today.getTime();
  const nowHour = new Date().getHours();

  return (
    <div className="wrap">
      <div className="lede">
        <h2>Rezervace klubovny</h2>
        <div className="legend">
          <span><span className="dot free" /> volno</span>
          <span><span className="dot busy" /> obsazeno</span>
        </div>
      </div>

      <div className="cal-card">
        <div className="cal-header">
          <div className="cal-month">{monthLabel}</div>
          <div className="cal-nav">
            <button className="btn btn-sm" onClick={() => changeMonth(-1)}>‹ dřívější</button>
            <button className="btn btn-sm" onClick={() => changeMonth(1)}>pozdější ›</button>
          </div>
        </div>
        <div className="cal-grid">
          {DOW.map((d) => (
            <div key={d} className="cal-dow">{d}</div>
          ))}
          {cells}
        </div>
        {loading && <div className="hint" style={{ marginTop: 10 }}>Načítám obsazenost…</div>}
      </div>

      {selectedDate && (
        <div className="slots-card">
          <div className="slots-title">
            <h3>{fmtDateHuman(selectedDate)}</h3>
            <span className="hint">
              {slotsOnDate(selectedDate).length
                ? `${slotsOnDate(selectedDate).length} rezervace tento den`
                : 'zatím žádné rezervace'}
            </span>
          </div>
          <div className="slots-grid">
            {slotList.map((s) => {
              const busy = isHourBusy(selectedDate, s.start);
              const isPast = !!isSelectedToday && s.start <= nowHour;
              let cls = 'slot';
              if (busy) cls += ' busy';
              else if (isPast) cls += ' past';
              return (
                <button
                  key={s.start}
                  type="button"
                  className={cls}
                  disabled={busy || isPast}
                  onClick={() => setModalHour(s.start)}
                >
                  {pad(s.start)}:00–{pad(s.end)}:00
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="footer-note">
        Rezervace lze vytvořit nejdříve na dnešní den a nejdéle rok dopředu.
      </div>

      {selectedDate && modalHour !== null && (
        <ReservationModal
          dateKeyStr={selectedDate}
          initialHour={modalHour}
          existingSlots={slotsOnDate(selectedDate)}
          onClose={() => setModalHour(null)}
          onCreated={() => {
            setModalHour(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
