import { Resend } from 'resend';
import { formatDateHuman, pad } from './reservation-logic';
import type { Reservation } from './types';

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Chybí RESEND_API_KEY v proměnných prostředí.');
  }
  return new Resend(apiKey);
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'onboarding@resend.dev';
}

function getAdminEmail(): string {
  const email = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!email) {
    throw new Error('Chybí ADMIN_NOTIFICATION_EMAIL v proměnných prostředí.');
  }
  return email;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// E-mail žadateli – jedno souhrnné potvrzení
function buildGuestEmail(reservations: Reservation[]): { subject: string; text: string; html: string } {
  const first = reservations[0];
  const isMultiple = reservations.length > 1;

  const subject = isMultiple
    ? `Potvrzení opakované rezervace klubovny Čtyřkoly (${reservations.length}×)`
    : `Potvrzení rezervace klubovny Čtyřkoly – ${formatDateHuman(first.date)}`;

  const listText = reservations
    .map((r) => `- ${formatDateHuman(r.date)}, ${pad(r.start_hour)}:00–${pad(r.end_hour)}:00`)
    .join('\n');

  const listHtml = reservations
    .map((r) => `<li>${formatDateHuman(r.date)}, ${pad(r.start_hour)}:00–${pad(r.end_hour)}:00</li>`)
    .join('');

  const text = isMultiple
    ? `Dobrý den ${first.name},

vaše opakovaná rezervace klubovny Čtyřkoly byla úspěšně vytvořena pro ${reservations.length} termínů:

${listText}

Účel rezervace: ${first.purpose}

Pokud potřebujete rezervaci zrušit nebo upravit, kontaktujte prosím správce klubovny.

Děkujeme.`
    : `Dobrý den ${first.name},

vaše rezervace klubovny Čtyřkoly byla úspěšně vytvořena.

Datum: ${formatDateHuman(first.date)}
Čas: ${pad(first.start_hour)}:00–${pad(first.end_hour)}:00
Účel rezervace: ${first.purpose}

Pokud potřebujete rezervaci zrušit nebo upravit, kontaktujte prosím správce klubovny.

Děkujeme.`;

  const html = isMultiple
    ? `<p>Dobrý den ${escapeHtml(first.name)},</p>
<p>vaše opakovaná rezervace klubovny Čtyřkoly byla úspěšně vytvořena pro ${reservations.length} termínů:</p>
<ul>${listHtml}</ul>
<p><strong>Účel rezervace:</strong> ${escapeHtml(first.purpose)}</p>
<p>Pokud potřebujete rezervaci zrušit nebo upravit, kontaktujte prosím správce klubovny.</p>
<p>Děkujeme.</p>`
    : `<p>Dobrý den ${escapeHtml(first.name)},</p>
<p>vaše rezervace klubovny Čtyřkoly byla úspěšně vytvořena.</p>
<p><strong>Datum:</strong> ${formatDateHuman(first.date)}<br/>
<strong>Čas:</strong> ${pad(first.start_hour)}:00–${pad(first.end_hour)}:00<br/>
<strong>Účel rezervace:</strong> ${escapeHtml(first.purpose)}</p>
<p>Pokud potřebujete rezervaci zrušit nebo upravit, kontaktujte prosím správce klubovny.</p>
<p>Děkujeme.</p>`;

  return { subject, text, html };
}

// E-mail administrátorovi – jeden souhrnný e-mail pro všechny termíny
function buildAdminEmail(reservations: Reservation[]): { subject: string; text: string; html: string } {
  const first = reservations[0];
  const isMultiple = reservations.length > 1;

  const subject = isMultiple
    ? `Nová opakovaná rezervace klubovny – ${first.name} (${reservations.length}×)`
    : `Nová rezervace klubovny – ${formatDateHuman(first.date)}, ${pad(first.start_hour)}:00–${pad(first.end_hour)}:00`;

  const listText = reservations
    .map((r) => `- ${formatDateHuman(r.date)}, ${pad(r.start_hour)}:00–${pad(r.end_hour)}:00`)
    .join('\n');

  const listHtml = reservations
    .map((r) => `<li>${formatDateHuman(r.date)}, ${pad(r.start_hour)}:00–${pad(r.end_hour)}:00</li>`)
    .join('');

  const text = isMultiple
    ? `Byla vytvořena nová opakovaná rezervace klubovny Čtyřkoly.

Termíny (${reservations.length}×):
${listText}

Jméno: ${first.name}
Telefon: ${first.phone}
E-mail: ${first.email}
Účel rezervace: ${first.purpose}
Vytvořeno: ${new Date(first.created_at).toLocaleString('cs-CZ')}`
    : `Byla vytvořena nová rezervace klubovny Čtyřkoly.

Datum: ${formatDateHuman(first.date)}
Čas: ${pad(first.start_hour)}:00–${pad(first.end_hour)}:00
Jméno: ${first.name}
Telefon: ${first.phone}
E-mail: ${first.email}
Účel rezervace: ${first.purpose}
Vytvořeno: ${new Date(first.created_at).toLocaleString('cs-CZ')}`;

  const html = isMultiple
    ? `<p>Byla vytvořena nová opakovaná rezervace klubovny Čtyřkoly.</p>
<p><strong>Termíny (${reservations.length}×):</strong></p>
<ul>${listHtml}</ul>
<table cellpadding="4">
<tr><td><strong>Jméno</strong></td><td>${escapeHtml(first.name)}</td></tr>
<tr><td><strong>Telefon</strong></td><td>${escapeHtml(first.phone)}</td></tr>
<tr><td><strong>E-mail</strong></td><td>${escapeHtml(first.email)}</td></tr>
<tr><td><strong>Účel rezervace</strong></td><td>${escapeHtml(first.purpose)}</td></tr>
</table>`
    : `<p>Byla vytvořena nová rezervace klubovny Čtyřkoly.</p>
<table cellpadding="4">
<tr><td><strong>Datum</strong></td><td>${formatDateHuman(first.date)}</td></tr>
<tr><td><strong>Čas</strong></td><td>${pad(first.start_hour)}:00–${pad(first.end_hour)}:00</td></tr>
<tr><td><strong>Jméno</strong></td><td>${escapeHtml(first.name)}</td></tr>
<tr><td><strong>Telefon</strong></td><td>${escapeHtml(first.phone)}</td></tr>
<tr><td><strong>E-mail</strong></td><td>${escapeHtml(first.email)}</td></tr>
<tr><td><strong>Účel rezervace</strong></td><td>${escapeHtml(first.purpose)}</td></tr>
</table>`;

  return { subject, text, html };
}

// Odešle jeden e-mail žadateli a jeden souhrnný e-mail administrátorovi
// (bez ohledu na počet termínů v opakované rezervaci).
export async function sendReservationEmails(createdReservations: Reservation[]): Promise<void> {
  if (createdReservations.length === 0) return;

  const resend = getResend();
  const from = getFromAddress();
  const adminEmail = getAdminEmail();
  const first = createdReservations[0];

  const guest = buildGuestEmail(createdReservations);
  const admin = buildAdminEmail(createdReservations);

  try {
    await resend.emails.send({
      from,
      to: first.email,
      subject: guest.subject,
      text: guest.text,
      html: guest.html,
    });
  } catch (err) {
    console.error('Nepodařilo se odeslat e-mail žadateli:', err);
  }

  try {
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: admin.subject,
      text: admin.text,
      html: admin.html,
    });
  } catch (err) {
    console.error('Nepodařilo se odeslat e-mail administrátorovi:', err);
  }
}
