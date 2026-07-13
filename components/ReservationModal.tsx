'use client';

import { useState } from 'react';
import { CLOSE_HOUR, fmtDateHuman, hourSlots, pad } from '@/lib/calendar-helpers';
import type { AvailabilitySlot } from '@/lib/types';

interface Props {
  dateKeyStr: string;
  initialHour: number;
  existingSlots: AvailabilitySlot[];
  onClose: () => void;
  onCreated: () => void;
}

interface GuestEmailPreview {
  to: string;
  subject: string;
  body: string;
}

export default function ReservationModal({
  dateKeyStr,
  initialHour,
  existingSlots,
  onClose,
  onCreated,
}: Props) {
  function isHourBusy(hour: number) {
    return existingSlots.some((s) => hour >= s.start_hour && hour < s.end_hour);
  }

  function maxFreeEnd(startHour: number) {
    let maxEnd = startHour + 1;
    for (let h = startHour; h < CLOSE_HOUR; h++) {
      if (isHourBusy(h)) break;
      maxEnd = h + 1;
    }
    return maxEnd;
  }

  const [startHour, setStartHour] = useState(initialHour);
  const [endHour, setEndHour] = useState(initialHour + 1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [recurEnabled, setRecurEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [count, setCount] = useState(12);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    guestEmail: GuestEmailPreview | null;
  } | null>(null);

  const slots = hourSlots();
  const currentMaxEnd = maxFreeEnd(startHour);
  const startOptions = slots
    .filter((s) => s.start < currentMaxEnd && !isHourBusy(s.start))
    .map((s) => s.start);
  const endOptions = slots
    .map((s) => s.end)
    .filter((e) => e > startHour && e <= currentMaxEnd);

  function handleStartChange(newStart: number) {
    setStartHour(newStart);
    const newMaxEnd = maxFreeEnd(newStart);
    if (endHour <= newStart || endHour > newMaxEnd) {
      setEndHour(newStart + 1);
    }
  }

  async function handleSubmit() {
    setError('');
    if (!name.trim() || !phone.trim()) {
      setError('Vyplňte prosím alespoň jméno a telefon.');
      return;
    }
    if (!purpose.trim()) {
      setError('Vyplňte prosím účel rezervace.');
      return;
    }
    if (!email.trim()) {
      setError('Vyplňte prosím e-mail, na který vám zašleme potvrzení rezervace.');
      return;
    }
    if (endHour <= startHour) {
      setError('Koncová hodina musí být později než počáteční.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateKeyStr,
          start_hour: startHour,
          end_hour: endHour,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          purpose: purpose.trim(),
          recurrence: {
            enabled: recurEnabled,
            frequency,
            count,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Nepodařilo se vytvořit rezervaci.');
        setSubmitting(false);
        return;
      }

      setResult({
        created: data.created,
        skipped: data.skipped,
        guestEmail: {
          to: email.trim(),
          subject: `Potvrzení rezervace klubovny Čtyřkoly – ${fmtDateHuman(dateKeyStr)}`,
          body: `Potvrzení bylo odesláno na ${email.trim()}. Obsahuje datum, čas a účel rezervace.`,
        },
      });
    } catch {
      setError('Nepodařilo se spojit se serverem. Zkuste to prosím znovu.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="overlay show">
        <div className="modal">
          <h3>Rezervace vytvořena</h3>
          <div className="sub">
            {result.created > 1
              ? `Vytvořeno ${result.created} termínů.`
              : 'Termín byl úspěšně rezervován.'}
            {result.skipped > 0 &&
              ` ${result.skipped} termínů bylo obsazených a bylo vynecháno.`}
          </div>
          <div className="email-preview">
            <div className="email-preview-label">Potvrzení odesláno e-mailem</div>
            <div className="email-preview-to">Komu: {result.guestEmail?.to}</div>
            <div className="email-preview-subject">{result.guestEmail?.subject}</div>
          </div>
          <div className="hint" style={{ marginTop: 10 }}>
            Administrátor byl o rezervaci automaticky informován e-mailem.
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onCreated}>
              Zavřít
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay show">
      <div className="modal">
        <h3>Nová rezervace</h3>
        <div className="sub">{fmtDateHuman(dateKeyStr)}</div>
        {error && <div className="error-box show">{error}</div>}

        <div className="field-row">
          <div className="field">
            <label htmlFor="rStart">Od</label>
            <select
              id="rStart"
              value={startHour}
              onChange={(e) => handleStartChange(parseInt(e.target.value, 10))}
            >
              {startOptions.map((h) => (
                <option key={h} value={h}>{pad(h)}:00</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rEnd">Do</label>
            <select id="rEnd" value={endHour} onChange={(e) => setEndHour(parseInt(e.target.value, 10))}>
              {endOptions.map((h) => (
                <option key={h} value={h}>{pad(h)}:00</option>
              ))}
            </select>
          </div>
        </div>
        <div className="hint" style={{ marginBottom: 14 }}>
          Lze rezervovat víc hodin najednou, dokud jsou volné.
        </div>

        <div className="field">
          <label htmlFor="rName">Jméno a příjmení</label>
          <input id="rName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jana Nováková" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="rPhone">Telefon</label>
            <input id="rPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+420 600 000 000" />
          </div>
          <div className="field">
            <label htmlFor="rEmail">E-mail</label>
            <input id="rEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jana@email.cz" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="rPurpose">Účel rezervace</label>
          <input
            id="rPurpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="např. oslava, schůze spolku, kroužek..."
          />
          <div className="hint">Uveďte, k čemu prostor využijete.</div>
        </div>

        <div className="recur-box">
          <div className="checkbox-row">
            <input
              type="checkbox"
              id="rRecur"
              checked={recurEnabled}
              onChange={(e) => setRecurEnabled(e.target.checked)}
            />
            <label htmlFor="rRecur">Opakovaná rezervace</label>
          </div>
          {recurEnabled && (
            <>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="rFreq">Frekvence</label>
                  <select id="rFreq" value={frequency} onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}>
                    <option value="weekly">Každý týden</option>
                    <option value="monthly">Každý měsíc</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="rCount">Počet opakování</label>
                  <input
                    id="rCount"
                    type="number"
                    min={2}
                    max={60}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value || '2', 10))}
                  />
                </div>
              </div>
              <div className="hint">
                Termíny se vygenerují od vybraného data, max. rok dopředu. Pokud bude některý
                termín obsazený, ten konkrétní termín se vynechá.
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Zrušit
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Vytvářím…' : 'Vytvořit rezervaci'}
          </button>
        </div>
      </div>
    </div>
  );
}
