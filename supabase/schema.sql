-- =============================================================
-- Schéma databáze pro rezervační systém klubovny Čtyřkoly
-- Spusťte tento skript v Supabase: Project → SQL Editor → New query
-- =============================================================

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_hour smallint not null check (start_hour >= 0 and start_hour < 24),
  end_hour smallint not null check (end_hour > 0 and end_hour <= 24),
  name text not null,
  phone text not null,
  email text not null,
  purpose text not null,
  recurrence_id uuid null,
  created_at timestamptz not null default now(),

  constraint end_after_start check (end_hour > start_hour)
);

-- Index pro rychlé dotazy na termíny v konkrétní den a rozsah hodin
create index if not exists idx_reservations_date on reservations (date);
create index if not exists idx_reservations_recurrence on reservations (recurrence_id);

-- =============================================================
-- ROW LEVEL SECURITY
-- Veřejnost smí jen číst (a to bez jména/telefonu/e-mailu - to
-- řeší API route, ne RLS), vytvářet rezervace přes API route
-- s ověřením kolize na serveru. Mazání a čtení detailů je jen
-- pro přihlášeného admina.
-- =============================================================
alter table reservations enable row level security;

-- Veřejnost může číst JEN sloupce potřebné pro výpočet obsazenosti.
-- Protože Postgres RLS nefiltruje sloupce, veřejné čtení detailů
-- (jméno/telefon/e-mail) blokujeme tím, že veřejná stránka NIKDY
-- nečte tabulku přímo - vždy jde přes API route /api/availability,
-- která vrací jen date/start_hour/end_hour. Přímý přístup z prohlížeče
-- na tabulku je zakázán úplně (žádná policy pro anon roli níže),
-- čtení i psaní jde jen přes server (service role key v API routes).

-- Žádné policy pro anon/authenticated role = veřejnost nemá
-- přímý přístup k tabulce vůbec. Veškerá komunikace jde přes
-- Next.js API routes, které používají service role key na serveru.

-- =============================================================
-- Pomocná view jen pro ověření, že vše vzniklo (nepoužívá se v appce)
-- =============================================================
comment on table reservations is 'Rezervace klubovny Čtyřkoly. Přístup pouze přes server-side API routes.';
