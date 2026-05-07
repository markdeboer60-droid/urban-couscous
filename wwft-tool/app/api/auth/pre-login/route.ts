/**
 * /api/auth/pre-login — validate credentials and return whether 2FA is required.
 * Used by the login page to decide whether to show the TOTP input.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// In-memory rate limiter: max 10 attempts per IP per 15-minute window
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) return true;
  return false;
}

function clearAttempts(ip: string) {
  attempts.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return Response.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 });
  }

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

  // Successful login — clear rate limit counter
  clearAttempts(ip);
  return Response.json({ valid: true, requires2fa: user.totpEnabled });
}
