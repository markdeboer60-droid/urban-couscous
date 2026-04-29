/**
 * /api/auth/pre-login — validate credentials and return whether 2FA is required.
 * Used by the login page to decide whether to show the TOTP input.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password }: { email: string; password: string } = await req.json();

  if (!email || !password) {
    return Response.json({ error: "email en password verplicht" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return same response as wrong password to prevent user enumeration
    return Response.json({ valid: false });
  }

  const valid = await bcrypt.compare(password, user.wachtwoordHash);
  if (!valid) {
    return Response.json({ valid: false });
  }

  return Response.json({ valid: true, requires2fa: user.totpEnabled });
}
