import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromCookies } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  const isAdmin = await getAdminSessionFromCookies();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('date', { ascending: true })
    .order('start_hour', { ascending: true });

  if (error) {
    console.error('Chyba při čtení rezervací pro admina:', error);
    return NextResponse.json({ error: 'Nepodařilo se načíst rezervace.' }, { status: 500 });
  }

  return NextResponse.json({ reservations: data });
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await getAdminSessionFromCookies();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const wholeSeries = searchParams.get('series') === '1';

  if (!id) {
    return NextResponse.json({ error: 'Chybí id rezervace.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (wholeSeries) {
    const { data: existing, error: fetchError } = await supabase
      .from('reservations')
      .select('recurrence_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing?.recurrence_id) {
      return NextResponse.json({ error: 'Rezervace nepatří do žádné série.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('recurrence_id', existing.recurrence_id);

    if (deleteError) {
      console.error('Chyba při mazání série:', deleteError);
      return NextResponse.json({ error: 'Nepodařilo se smazat sérii rezervací.' }, { status: 500 });
    }
  } else {
    const { error: deleteError } = await supabase.from('reservations').delete().eq('id', id);

    if (deleteError) {
      console.error('Chyba při mazání rezervace:', deleteError);
      return NextResponse.json({ error: 'Nepodařilo se smazat rezervaci.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
