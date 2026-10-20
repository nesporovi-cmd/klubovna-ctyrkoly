import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendReservationEmails } from '@/lib/email';
import type { CreateReservationInput, Reservation } from '@/lib/types';
import { OPEN_HOUR, CLOSE_HOUR, MAX_DAYS_AHEAD } from '@/lib/types';

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function generateRecurringDates(
  startDate: string,
  recurrence: 'weekly' | 'monthly'
): string[] {
  const dates: string[] = [];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);

  let current = startDate;
  let i = 0;
  while (i < 52) {
    const d = new Date(current);
    if (d > maxDate) break;
    dates.push(current);
    i++;
    current =
      recurrence === 'weekly'
        ? addWeeks(startDate, i)
        : addMonths(startDate, i);
  }
  return dates;
}

export async function POST(req: NextRequest) {
  let body: CreateReservationInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neplatné JSON tělo požadavku.' }, { status: 400 });
  }

  const { date, start_hour, end_hour, name, phone, email, address, purpose, recurrence = 'none' } = body;

  // Validace
  if (!date || start_hour == null || end_hour == null || !name || !phone || !email || !address || !purpose) {
    return NextResponse.json({ error: 'Všechna povinná pole musí být vyplněna.' }, { status: 400 });
  }
  if (start_hour < OPEN_HOUR || end_hour > CLOSE_HOUR || start_hour >= end_hour) {
    return NextResponse.json({ error: 'Neplatný časový rozsah.' }, { status: 400 });
  }
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_DAYS_AHEAD);
  const maxDateStr = maxDate.toISOString().split('T')[0];
  if (date < today || date > maxDateStr) {
    return NextResponse.json({ error: 'Datum je mimo povolený rozsah.' }, { status: 400 });
  }

  const dates =
    recurrence === 'none'
      ? [date]
      : generateRecurringDates(date, recurrence);

  const recurrence_id =
    recurrence !== 'none' ? crypto.randomUUID() : null;

  const supabaseAdmin = createAdminClient();

  // Kontrola kolizí
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('reservations')
    .select('date, start_hour, end_hour')
    .in('date', dates);

  if (fetchError) {
    console.error('Chyba při načítání rezervací:', fetchError);
    return NextResponse.json({ error: 'Nepodařilo se ověřit dostupnost.' }, { status: 500 });
  }

  for (const d of dates) {
    const dayReservations = (existing || []).filter((r) => r.date === d);
    for (const r of dayReservations) {
      if (start_hour < r.end_hour && end_hour > r.start_hour) {
        return NextResponse.json(
          { error: `Termín ${d} ${start_hour}:00–${end_hour}:00 je již obsazen.` },
          { status: 409 }
        );
      }
    }
  }

  // Vložení rezervací
  const rows = dates.map((d) => ({
    date: d,
    start_hour,
    end_hour,
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    address: address.trim(),
    purpose: purpose.trim(),
    recurrence_id,
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('reservations')
    .insert(rows)
    .select();

  if (insertError || !inserted) {
    console.error('Chyba při ukládání rezervace:', insertError);
    return NextResponse.json({ error: 'Nepodařilo se uložit rezervaci.' }, { status: 500 });
  }

  // Odeslání e-mailů
  try {
    await sendReservationEmails(inserted as Reservation[]);
  } catch (err) {
    console.error('Chyba při odesílání e-mailů:', err);
  }

  return NextResponse.json({ success: true, count: inserted.length }, { status: 201 });
}
