/**
 * config.ts — validated runtime configuration helpers.
 */

/** Returns the application base URL, validating that production uses HTTPS. */
export function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) return "http://localhost:3000";
  // Reject non-HTTPS in production to prevent insecure links in emails.
  if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) {
    console.error("[config] NEXTAUTH_URL must use https:// in production");
    return "http://localhost:3000";
  }
  return url;
}
