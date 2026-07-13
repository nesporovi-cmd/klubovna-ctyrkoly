import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendReservationEmails } from '@/lib/email';
import {
  dateToKey,
  generateRecurrenceDates,
  isValidHourRange,
  isWithinBookableRange,
  keyToDate,
} from '@/lib/reservation-logic';
import type { CreateReservationInput, Reservation } from '@/lib/types';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let body: CreateReservationInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný formát požadavku.' }, { status: 400 });
  }

  const { date, start_hour, end_hour, name, phone, email, purpose, recurrence } = body;

  // ---- Validace vstupu ----
  if (!name?.trim() || !phone?.trim() || !email?.trim() || !purpose?.trim()) {
    return NextResponse.json(
      { error: 'Vyplňte prosím jméno, telefon, e-mail a účel rezervace.' },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Zadejte prosím platný e-mail.' }, { status: 400 });
  }
  if (!isValidHourRange(start_hour, end_hour)) {
    return NextResponse.json({ error: 'Neplatný časový rozsah.' }, { status: 400 });
  }

  let baseDate: Date;
  try {
    baseDate = keyToDate(date);
    if (Number.isNaN(baseDate.getTime())) throw new Error('invalid');
  } catch {
    return NextResponse.json({ error: 'Neplatné datum.' }, { status: 400 });
  }
  if (!isWithinBookableRange(baseDate)) {
    return NextResponse.json(
      { error: 'Rezervaci lze vytvořit jen od dnešního dne do jednoho roku dopředu.' },
      { status: 400 }
    );
  }

  // ---- Sestavení seznamu dnů k rezervaci ----
  let datesToBook = [baseDate];
  const isRecurring = !!recurrence?.enabled;

  if (isRecurring) {
    const count = Math.max(2, Math.min(60, recurrence.count || 2));
    if (recurrence.frequency !== 'weekly' && recurrence.frequency !== 'monthly') {
      return NextResponse.json({ error: 'Neplatná frekvence opakování.' }, { status: 400 });
    }
    datesToBook = generateRecurrenceDates(baseDate, recurrence.frequency, count);
  }

  const supabase = createAdminClient();
  const recurrenceId = isRecurring ? randomUUID() : null;
  const created: Reservation[] = [];
  let skipped = 0;

  // ---- Pro každý den zkontrolujeme kolizi a vložíme rezervaci ----
  // Provádí se sekvenčně (ne najednou), aby kontrola kolize a vložení
  // byly co nejblíže atomické. Při souběžných požadavcích pořád
  // existuje malé okno pro race condition - pro produkci s vyšším
  // provozem by šlo přidat unique constraint v databázi na
  // (date, start_hour) překryv přes EXCLUDE constraint v Postgresu.
  for (const d of datesToBook) {
    const dateKey = dateToKey(d);

    const { data: existing, error: checkError } = await supabase
      .from('reservations')
      .select('start_hour, end_hour')
      .eq('date', dateKey);

    if (checkError) {
      console.error('Chyba při kontrole kolize:', checkError);
      return NextResponse.json({ error: 'Nepodařilo se ověřit obsazenost termínu.' }, { status: 500 });
    }

    const hasCollision = (existing || []).some(
      (r) => start_hour < r.end_hour && end_hour > r.start_hour
    );

    if (hasCollision) {
      skipped++;
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('reservations')
      .insert({
        date: dateKey,
        start_hour,
        end_hour,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        purpose: purpose.trim(),
        recurrence_id: recurrenceId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Chyba při vkládání rezervace:', insertError);
      return NextResponse.json({ error: 'Nepodařilo se uložit rezervaci.' }, { status: 500 });
    }

    created.push(inserted as Reservation);
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: 'Všechny zvolené termíny jsou již obsazené.', created: 0, skipped },
      { status: 409 }
    );
  }

  // E-mail se odesílá až po úspěšném uložení do databáze a jeho
  // případné selhání nemá vliv na to, že rezervace existuje.
  await sendReservationEmails(created);

  return NextResponse.json({ created: created.length, skipped });
}
