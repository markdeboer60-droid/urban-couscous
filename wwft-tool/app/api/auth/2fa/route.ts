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

function unauthorized() {
  return Response.json({ error: "Niet geautoriseerd" }, { status: 401 });
}

/** GET /api/auth/2fa — generate new secret for setup */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();
  const user = session.user as unknown as SessionUser;

  const secret = generateTotpSecret();
  const uri = getTotpUri(secret, user.email);

  // Store temp secret — user must confirm before enabling
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret },
  });

  return Response.json({ secret, uri });
}

/** POST /api/auth/2fa — confirm token to enable 2FA */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();
  const user = session.user as unknown as SessionUser;

  const { token }: { token: string } = await req.json();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.totpSecret) {
    return Response.json({ error: "Geen TOTP-secret gevonden. Start setup opnieuw." }, { status: 400 });
  }

  if (!verifyTotpToken(dbUser.totpSecret, token)) {
    return Response.json({ error: "Ongeldige code. Probeer opnieuw." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true },
  });

  return Response.json({ ok: true });
}

/** DELETE /api/auth/2fa — disable 2FA */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();
  const user = session.user as unknown as SessionUser;

  const { token }: { token: string } = await req.json();

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.totpEnabled || !dbUser.totpSecret) {
    return Response.json({ error: "2FA is niet ingeschakeld" }, { status: 400 });
  }

  if (!verifyTotpToken(dbUser.totpSecret, token)) {
    return Response.json({ error: "Ongeldige code" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null },
  });

  return Response.json({ ok: true });
}
