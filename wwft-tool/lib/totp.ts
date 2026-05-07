/**
 * totp.ts — TOTP helpers using otplib sync API.
 */

import { generateSecret, generateSync, verifySync, generateURI } from "otplib";

export { generateSecret as generateTotpSecret };

// Prevents replay attacks: tracks used tokens keyed by userId:timeStep (30s windows).
// otplib default window=1 accepts ±1 windows; a stolen token within that window
// would otherwise be accepted a second time.
const usedTokens = new Map<string, number>();
let lastCleanup = Date.now();

function cleanUsedTokens() {
  const cutoff = Date.now() - 90_000;
  for (const [k, t] of usedTokens) {
    if (t < cutoff) usedTokens.delete(k);
  }
  lastCleanup = Date.now();
}

export function verifyTotpToken(secret: string, token: string, userId?: string): boolean {
  try {
    const result = verifySync({ secret, token });
    const valid = typeof result === "object" ? result.valid : Boolean(result);
    if (!valid) return false;

    if (userId) {
      const timeStep = Math.floor(Date.now() / 30_000);
      const key = `${userId}:${timeStep}`;
      if (usedTokens.has(key)) return false;
      usedTokens.set(key, Date.now());
      if (Date.now() - lastCleanup > 60_000 || usedTokens.size > 500) cleanUsedTokens();
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
