/**
 * /api/auth/2fa — TOTP setup, verify, and disable endpoints.
 *
 * GET  — generate a new TOTP secret + QR code URI (setup)
 * POST — confirm token to enable 2FA
 * DELETE — disable 2FA (requires valid token)
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, verifyTotpToken, getTotpUri } from "@/lib/totp";
import type { SessionUser } from "@/types";

// In-memory rate limiter: max 5 TOTP attempts per user per minute.
// Process-local; resets on restart. Sufficient to slow brute-force on a single instance.
const rl = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rl.get(userId);
  if (!entry || entry.resetAt < now) {
    rl.set(userId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

/** GET /api/auth/2fa — generate new secret for setup (not persisted until confirmed) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();
  const user = session.user as unknown as SessionUser;

  const secret = generateTotpSecret();
  const uri = getTotpUri(secret, user.email);

  // Secret is NOT stored until the user confirms with a valid TOTP code (POST below).
  return Response.json({ secret, uri });
}

/** POST /api/auth/2fa — confirm token to enable 2FA */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();
  const user = session.user as unknown as SessionUser;

  if (isRateLimited(user.id)) {
    return Response.json({ error: "Te veel pogingen. Probeer het over een minuut opnieuw." }, { status: 429 });
  }

  const { token, secret }: { token: string; secret?: string } = await req.json();

  // Accept either a freshly confirmed secret (new setup) or the existing DB secret (re-confirmation)
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const effectiveSecret = secret ?? dbUser?.totpSecret ?? null;

  if (!effectiveSecret) {
    return Response.json({ error: "Geen TOTP-secret opgegeven." }, { status: 400 });
  }

  if (!verifyTotpToken(effectiveSecret, token, user.id)) {
    return Response.json({ error: "Ongeldige code. Probeer opnieuw." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: effectiveSecret, totpEnabled: true },
  });

  return Response.json({ ok: true });
}

/** DELETE /api/auth/2fa — disable 2FA */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();
  const user = session.user as unknown as SessionUser;

  if (isRateLimited(user.id)) {
    return Response.json({ error: "Te veel pogingen. Probeer het over een minuut opnieuw." }, { status: 429 });
  }

  const { token }: { token: string } = await req.json();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.totpEnabled || !dbUser.totpSecret) {
    return Response.json({ error: "2FA is niet ingeschakeld" }, { status: 400 });
  }

  if (!verifyTotpToken(dbUser.totpSecret, token, user.id)) {
    return Response.json({ error: "Ongeldige code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  });

  return Response.json({ ok: true });
}
