/**
 * totp.ts — TOTP helpers using otplib sync API.
 */

import { generateSecret, generateSync, verifySync, generateURI } from "otplib";

export { generateSecret as generateTotpSecret };

export function verifyTotpToken(secret: string, token: string): boolean {
  try {
    const result = verifySync({ secret, token });
    return typeof result === "object" ? result.valid : Boolean(result);
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
