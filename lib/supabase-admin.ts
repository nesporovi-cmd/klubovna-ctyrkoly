import { createClient } from '@supabase/supabase-js';

// Tento klient používá service role key a smí ho používat VÝHRADNĚ
// kód běžící na serveru (API routes) - nikdy v komponentách
// označených 'use client' a nikdy se nesmí dostat do prohlížeče.
// Service role key obchází Row Level Security, takže veškerá
// validace (kolize termínů, povinná pole) musí probíhat v API routes.
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v proměnných prostředí.'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
