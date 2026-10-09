/**
 * Canonical form of a page URL for matching: lowercase host without "www.",
 * no query or fragment, no trailing slash. Search Console, SERP results and
 * hand-typed target pages disagree on these details for the same page.
 * Returns null for anything that is not an http(s) URL.
 */
export function normalizePageUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  return `${host}${path}`;
}
