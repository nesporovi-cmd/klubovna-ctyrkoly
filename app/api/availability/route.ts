import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

// Veřejný endpoint - vrací POUZE date/start_hour/end_hour pro daný měsíc.
// Nikdy nevrací jméno, telefon ani e-mail. Tabulka reservations
// nemá RLS policy pro anon roli, takže tohle je jediná cesta,
// jak se k datům o obsazenosti dostat z prohlížeče.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || '', 10);
  const month = parseInt(searchParams.get('month') || '', 10); // 1-12

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Neplatný rok nebo měsíc.' }, { status: 400 });
  }

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('reservations')
      .select('date, start_hour, end_hour')
      .gte('date', monthStart)
      .lte('date', monthEnd);

    if (error) {
      console.error('Chyba při čtení obsazenosti:', error);
      return NextResponse.json({ error: 'Nepodařilo se načíst obsazenost.' }, { status: 500 });
    }

    return NextResponse.json({ slots: data });
  } catch (err) {
    console.error('Neočekávaná chyba v /api/availability:', err);
    return NextResponse.json({ error: 'Nastala neočekávaná chyba.' }, { status: 500 });
  }
}
