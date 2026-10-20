'use client';

import { useState } from 'react';
import { OPEN_HOUR, CLOSE_HOUR } from '@/lib/types';

interface Props {
  dateKeyStr: string;
  initialHour: number;
  existingSlots: { start_hour: number; end_hour: number }[];
  onClose: () => void;
  onCreated: () => void;
}

export default function ReservationModal({ dateKeyStr, initialHour, existingSlots, onClose, onCreated }: Props) {
  const [startHour, setStartHour] = useState(initialHour ?? OPEN_HOUR);
  const [endHour, setEndHour] = useState((initialHour ?? OPEN_HOUR) + 1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'monthly'>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (startHour >= endHour) {
      setError('Čas „Od" musí být dříve než „Do".');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateKeyStr,
          start_hour: startHour,
          end_hour: endHour,
          name,
          phone,
          email,
          address,
          purpose,
          recurrence,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Nepodařilo se vytvořit rezervaci.');
      } else {
        onCreated();
      }
    } catch {
      setError('Nepodařilo se spojit se serverem.');
    } finally {
      setLoading(false);
    }
  }

  // Formátování data pro zobrazení
  const displayDate = new Date(dateKeyStr + 'T00:00:00').toLocaleDateString('cs-CZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Zavřít">
          ✕
        </button>
        <h2 className="modal-title">Nová rezervace</h2>
        <p className="modal-date">{displayDate}</p>

        <form onSubmit={handleSubmit} className="reservation-form">
          {/* Čas */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startHour">Od</label>
              <select
                id="startHour"
                value={startHour}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setStartHour(v);
                  if (endHour <= v) setEndHour(v + 1);
                }}
                required
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="endHour">Do</label>
              <select
                id="endHour"
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                required
              >
                {Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i + 1)
                  .filter((h) => h > startHour)
                  .map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Osobní údaje */}
          <div className="form-group">
            <label htmlFor="name">Jméno a příjmení *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jan Novák"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Adresa *</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Čtyřkoly 123"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefon *</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420 123 456 789"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-mail *</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan.novak@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="purpose">Účel rezervace *</label>
            <textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Např. narozeninová oslava, schůze spolku…"
              rows={3}
              required
            />
          </div>

          {/* Opakování */}
          <div className="form-group">
            <label htmlFor="recurrence">Opakování</label>
            <select
              id="recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as 'none' | 'weekly' | 'monthly')}
            >
              <option value="none">Bez opakování</option>
              <option value="weekly">Každý týden</option>
              <option value="monthly">Každý měsíc</option>
            </select>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Odesílám…' : 'Rezervovat'}
          </button>
        </form>
      </div>
    </div>
  );
}
