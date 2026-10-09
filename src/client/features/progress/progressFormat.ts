/** Today as YYYY-MM-DD in the browser's timezone, for the annotation form. */
export function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "Oct 8" for a stored YYYY-MM-DD or ISO timestamp. */
export function formatShortDate(value: string): string {
  const ms = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(ms)) return value;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** The path (and host only for the root) of a page URL, for compact display. */
export function pageLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return path === "" ? parsed.hostname : path;
  } catch {
    return url;
  }
}

/** "▲ 3" / "▼ 2" / "" for a change; `better` says which direction is good news. */
export function formatChange(change: number): {
  text: string;
  tone: "good" | "bad" | "flat";
} {
  if (change === 0) return { text: "no change", tone: "flat" };
  return {
    text: `${change > 0 ? "▲" : "▼"} ${Math.abs(change)}`,
    tone: change > 0 ? "good" : "bad",
  };
}
