/**
 * highlight.ts — Wwft risico-keyword highlighter
 * Wraps matches in <mark> tags for visual risk-word highlighting.
 * Used in ResultCard to highlight OSINT snippets.
 */

/** List of Wwft-relevant risk keywords (Dutch) */
export const RISICO_WOORDEN: string[] = [
  "fraude",
  "witwassen",
  "FIOD",
  "faillissement",
  "boete",
  "rechtbank",
  "oplichting",
  "verduistering",
  "sanctie",
  "terrorisme",
  "offshore",
  "Panama",
  "Pandora",
  "corruptie",
  "omkoping",
];

/**
 * Highlight Wwft risk words in a plain-text string.
 * Returns an HTML string with matching words wrapped in `<mark>` tags.
 * Safe against XSS: the input string is entity-escaped before substitution.
 *
 * @param text - Plain text to process
 * @returns HTML string with highlighted risk words
 */
export function highlightRisicoWoorden(text: string): string {
  if (!text) return "";

  // Escape HTML entities to prevent XSS
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // Build a case-insensitive alternation regex
  const pattern = RISICO_WOORDEN.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|");

  const regex = new RegExp(`(${pattern})`, "gi");

  return escaped.replace(regex, "<mark>$1</mark>");
}
