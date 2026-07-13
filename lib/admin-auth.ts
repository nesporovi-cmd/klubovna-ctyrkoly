import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'klubovna_admin_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 hodin

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('Chybí ADMIN_SESSION_SECRET v proměnných prostředí.');
  }
  return secret;
}

function sign(value: string): string {
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(value);
  return hmac.digest('hex');
}

// Vytvoří podepsaný token s expirací, který se uloží do cookie.
// Token obsahuje jen timestamp vypršení - nejsou v něm žádná
// citlivá data, ale podpis zabraňuje jeho podvržení bez znalosti
// ADMIN_SESSION_SECRET.
export function createSessionToken(): string {
  const expires = Date.now() + SESSION_DURATION_MS;
  const payload = `${expires}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload);
  // Porovnání v konstantním čase, aby nešlo útočit timing útokem
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  const expires = parseInt(payload, 10);
  if (Number.isNaN(expires)) return false;
  return Date.now() < expires;
}

export async function getAdminSessionFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_DURATION_MS = SESSION_DURATION_MS;
