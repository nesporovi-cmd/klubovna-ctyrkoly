import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getAdminSessionFromCookies } from '@/lib/admin-auth';
import { sendCancellationEmail } from '@/lib/email';
import type { Reservation } from '@/lib/types';

// GET – seznam všech rezervací (jen pro admina)
export async function GET(req: NextRequest) {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('date', { ascending: true })
    .order('start_hour', { ascending: true });

  if (error) {
    console.error('Chyba při načítání rezervací:', error);
    return NextResponse.json({ error: 'Nepodařilo se načíst rezervace.' }, { status: 500 });
  }

  return NextResponse.json({ reservations: data });
}

// DELETE – smazání jedné rezervace nebo celé série
export async function DELETE(req: NextRequest) {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const recurrenceId = searchParams.get('recurrence_id');

  if (!id && !recurrenceId) {
    return NextResponse.json({ error: 'Chybí id nebo recurrence_id.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (recurrenceId) {
    // Smazání celé opakované série – nejdřív načteme rezervace pro e-maily
    const { data: toDelete, error: fetchErr } = await supabase
      .from('reservations')
      .select('*')
      .eq('recurrence_id', recurrenceId);

    if (fetchErr) {
      return NextResponse.json({ error: 'Nepodařilo se načíst sérii.' }, { status: 500 });
    }

    const { error: delErr } = await supabase
      .from('reservations')
      .delete()
      .eq('recurrence_id', recurrenceId);

    if (delErr) {
      return NextResponse.json({ error: 'Nepodařilo se smazat sérii.' }, { status: 500 });
    }

    // Odeslat e-mail pro každou rezervaci v sérii
    if (toDelete) {
      for (const r of toDelete as Reservation[]) {
        await sendCancellationEmail(r);
      }
    }

    return NextResponse.json({ success: true });
  }

  // Smazání jedné rezervace – nejdřív načteme pro e-mail
  const { data: toDelete, error: fetchErr } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !toDelete) {
    return NextResponse.json({ error: 'Rezervace nenalezena.' }, { status: 404 });
  }

  const { error: delErr } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id);

  if (delErr) {
    return NextResponse.json({ error: 'Nepodařilo se smazat rezervaci.' }, { status: 500 });
  }

  // Odeslat e-mail o zrušení
  await sendCancellationEmail(toDelete as Reservation);

  return NextResponse.json({ success: true });
}
