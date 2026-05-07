/**
 * totp.ts — TOTP helpers using otplib sync API.
 */

import { generateSecret, generateSync, verifySync, generateURI } from "otplib";

export { generateSecret as generateTotpSecret };

// In-memory used-token store: key = "userId:timeStep", value = timestamp used
// Prevents replay attacks within the same 30-second window.
const _usedTokens = new Map<string, number>();

function _cleanUsedTokens() {
  const cutoff = Date.now() - 90_000; // keep 3 windows (90s) for safety
  for (const [k, t] of _usedTokens) {
    if (t < cutoff) _usedTokens.delete(k);
  }
}

export function verifyTotpToken(secret: string, token: string, userId?: string): boolean {
  try {
    const result = verifySync({ secret, token });
    const valid = typeof result === "object" ? result.valid : Boolean(result);
    if (!valid) return false;

    if (userId) {
      const timeStep = Math.floor(Date.now() / 30_000);
      const key = `${userId}:${timeStep}`;
      if (_usedTokens.has(key)) return false; // replay detected
      _usedTokens.set(key, Date.now());
      _cleanUsedTokens();
    }

    return true;
  } catch {
    return false;
  }
}

export function getTotpUri(secret: string, email: string): string {
  return generateURI({
    strategy: "totp",
    issuer: "Wwft Compliance Tool",
    label: email,
    secret,
  });
}

// Exported for internal tests only
export { generateSync as _generateTotpToken };
