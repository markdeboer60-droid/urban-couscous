/**
 * Magic-byte validation for uploaded files.
 * Prevents MIME-type spoofing where a client sends a malicious file
 * with a trusted Content-Type header.
 */

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export function validateMagicBytes(buffer: Buffer, mimeType: AllowedMime): boolean {
  if (mimeType === "application/pdf") {
    return buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "%PDF";
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  return false;
}

export const MIME_ERROR = "Alleen PDF, JPG en PNG zijn toegestaan";
export const SIZE_ERROR = "Bestand te groot (max 10 MB)";
export const MAX_BYTES = 10 * 1024 * 1024;
