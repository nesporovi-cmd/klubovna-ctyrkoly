# Klubovna Čtyřkoly – rezervační systém

Webová aplikace pro rezervaci obecní klubovny. Veřejnost vidí volné a
obsazené termíny a může vytvářet rezervace (i opakované, na víc hodin
najednou). Administrátor se přihlásí heslem a vidí detaily všech
rezervací, které může mazat jednotlivě nebo jako celou opakovanou sérii.
Žadatel i administrátor dostanou e-mailové potvrzení.

## Použité technologie

- **Next.js** (React) – frontend i backend (API routes) v jednom projektu
- **Supabase** – databáze (PostgreSQL), zdarma pro tento rozsah provozu
- **Resend** – odesílání e-mailů, zdarma do 3 000 e-mailů měsíčně
- **Vercel** – hosting, zdarma pro tento rozsah provozu

## 1. Nastavení Supabase (databáze)

1. Vytvořte si zdarma účet na [supabase.com](https://supabase.com) a nový projekt.
2. V projektu otevřete **SQL Editor** → **New query**.
3. Zkopírujte celý obsah souboru [`supabase/schema.sql`](./supabase/schema.sql) a spusťte ho (tlačítko **Run**). Vytvoří se tabulka `reservations`.
4. Přejděte na **Project Settings → API**. Budete potřebovat:
   - **Project URL** → použijete jako `SUPABASE_URL`
   - **service_role** klíč (v sekci „Project API keys") → použijete jako `SUPABASE_SERVICE_ROLE_KEY`

   Pozor: **service_role** klíč má plný přístup k databázi bez omezení.
   Nikdy ho nevkládejte do kódu běžícího v prohlížeči – v této aplikaci
   se používá výhradně na serveru (v API routes).

## 2. Nastavení Resend (e-maily)

1. Vytvořte si zdarma účet na [resend.com](https://resend.com).
2. V Dashboardu → **API Keys** vytvořte nový klíč → použijete jako `RESEND_API_KEY`.
3. Pro reálný provoz doporučujeme ověřit vlastní doménu obce (Dashboard → **Domains** → postup podle návodu, jde o vložení několika DNS záznamů u vašeho poskytovatele domény). Pak budete moct e-maily odesílat například z `rezervace@vase-obec.cz`.
4. Pro rychlé vyzkoušení bez vlastní domény lze jako `EMAIL_FROM` použít `onboarding@resend.dev` – ale tato adresa doručuje e-maily jen na adresu, kterou máte registrovanou v Resend účtu, takže pro ostrý provoz s reálnými žadateli je potřeba vlastní ověřená doména.

## 3. Proměnné prostředí

Zkopírujte `.env.local.example` jako `.env.local` a vyplňte:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=...
ADMIN_NOTIFICATION_EMAIL=...
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

`ADMIN_SESSION_SECRET` vygenerujte třeba příkazem `openssl rand -hex 32`
v terminálu – je to tajný klíč pro podepisování přihlašovací session,
neukazujte ho nikomu.

## 4. Lokální vyzkoušení

```bash
npm install
npm run dev
```

Aplikace poběží na `http://localhost:3000`. Administrace je na
`http://localhost:3000/admin`.

## 5. Nasazení na Vercel

1. Nahrajte tento projekt do GitHubu (vlastní repozitář).
2. Na [vercel.com](https://vercel.com) → **Add New Project** → vyberte repozitář.
3. V **Environment Variables** vložte stejné proměnné jako v `.env.local` (krok 3).
4. Klikněte **Deploy**.
5. Po nasazení Vercel přidělí adresu typu `vase-projekt.vercel.app`. V **Project Settings → Domains** lze přidat i vlastní doménu obce.

Při každé další změně kódu v GitHubu Vercel automaticky znovu nasadí
novou verzi.

## Jak to funguje – přehled

- **Veřejná stránka (`/`)** – kalendář čte obsazenost přes
  `/api/availability`, který vrací jen datum a hodiny (nikdy jméno,
  telefon ani e-mail). Vytvoření rezervace jde přes `/api/reservations`,
  který na serveru ověří kolizi s existujícími rezervacemi, uloží
  záznam do databáze a odešle e-maily.
- **Administrace (`/admin`)** – chráněna heslem. Po přihlášení server
  nastaví podepsanou cookie s časovým razítkem (platnost 12 hodin).
  Detaily rezervací a mazání jdou přes `/api/admin/reservations`, který
  cookie ověřuje při každém požadavku.
- **Opakované rezervace** – při vytvoření se vygenerují všechny termíny
  najednou (až na rok dopředu) a spojí se společným `recurrence_id`,
  takže administrátor může smazat jednotlivý termín nebo celou sérii.
- **E-maily** – po úspěšném uložení rezervace systém odešle žadateli
  potvrzení a administrátorovi e-mail se všemi podrobnostmi (jméno,
  telefon, e-mail, účel rezervace). Pokud odeslání e-mailu selže (např.
  výpadek Resend), rezervace v databázi zůstává uložená – jen se
  e-mail nedoručí a chyba se zaloguje.

## Úpravy provozních hodin nebo barev

- Otevírací hodiny klubovny: `OPEN_HOUR` a `CLOSE_HOUR` v souboru
  [`lib/types.ts`](./lib/types.ts).
- Maximální počet dní dopředu pro rezervaci: `MAX_DAYS_AHEAD` ve stejném
  souboru.
- Barvy a vzhled: proměnné na začátku souboru
  [`app/globals.css`](./app/globals.css) (`--moss` = volno, `--pin` =
  obsazeno).
