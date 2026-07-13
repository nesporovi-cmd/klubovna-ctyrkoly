import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, ADMIN_COOKIE_NAME, ADMIN_SESSION_DURATION_MS } from '@/lib/admin-auth';
import crypto from 'crypto';

// Porovnání hesla v konstantním čase, aby nešlo útočit timing útokem
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // I při různé délce provedeme porovnání, ať trvá podobně dlouho
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('Chybí ADMIN_PASSWORD v proměnných prostředí.');
    return NextResponse.json({ error: 'Přihlášení dočasně nedostupné.' }, { status: 500 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  if (!body.password || !safeCompare(body.password, adminPassword)) {
    return NextResponse.json({ error: 'Nesprávné heslo.' }, { status: 401 });
  }

  const token = createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_DURATION_MS / 1000,
    path: '/',
  });
  return response;
}
