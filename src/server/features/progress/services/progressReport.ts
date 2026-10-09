import { sort } from "remeda";
import { normalizePageUrl } from "@/shared/page-url";

/**
 * Pure shaping for the Progress page: folds tracked keywords, Search Console
 * rows and change notes into one row per page. Kept apart from the service so
 * the grouping rules are testable without a database or GSC.
 */

export type ProgressKeyword = {
  configId: string;
  trackingKeywordId: string;
  keyword: string;
  targetUrl: string | null;
  searchVolume: number | null;
  /** Latest position on the config's primary device; null = not in the top N. */
  position: number | null;
  /** Position at the comparison baseline; null = unranked or no earlier check. */
  previousPosition: number | null;
  /** True once at least one check has run for this keyword. */
  checked: boolean;
};

type ProgressGscRow = {
  url: string;
  clicks: number;
  impressions: number;
  position: number;
};

type ProgressAnnotation = {
  id: string;
  date: string;
  note: string;
  url: string | null;
};

type GscTotals = {
  clicks: number;
  impressions: number;
  position: number;
  prevClicks: number;
  prevImpressions: number;
};

type ProgressPage = {
  url: string;
  /** The project's own home page, shown first and in full. */
  isMain: boolean;
  gsc: GscTotals | null;
  keywords: ProgressKeyword[];
  /** Keywords with a position inside the top 10 now / at the baseline. */
  top10: { now: number; before: number };
  lastChange: ProgressAnnotation | null;
};

const TOP_N = 10;

function inTop(position: number | null) {
  return position !== null && position <= TOP_N;
}

function latestChange(
  own: ProgressAnnotation | undefined,
  siteWide: ProgressAnnotation | null,
): ProgressAnnotation | null {
  if (!own) return siteWide;
  if (!siteWide) return own;
  return siteWide.date > own.date ? siteWide : own;
}

export function buildProgressPages(input: {
  keywords: ProgressKeyword[];
  gsc: { current: ProgressGscRow[]; previous: ProgressGscRow[] } | null;
  annotations: ProgressAnnotation[];
  /** The project's bare domain; its home page is always listed. */
  mainDomain?: string | null;
}): ProgressPage[] {
  // Display URL per normalized key, first seen wins (target URLs come first so
  // the page keeps the URL the user typed rather than a GSC variant).
  const display = new Map<string, string>();
  const claim = (url: string | null) => {
    if (!url) return null;
    const key = normalizePageUrl(url);
    if (!key) return null;
    if (!display.has(key)) display.set(key, url);
    return key;
  };

  const mainKey = input.mainDomain
    ? claim(`https://${input.mainDomain}`)
    : null;

  const keywordsByPage = new Map<string, ProgressKeyword[]>();
  for (const keyword of input.keywords) {
    const key = claim(keyword.targetUrl);
    if (!key) continue;
    keywordsByPage.set(key, [...(keywordsByPage.get(key) ?? []), keyword]);
  }

  // Annotations come newest first, so the first one per page is the latest.
  // A note without a page covers the whole site, so every page inherits the
  // newest one when it is more recent than the page's own note.
  const lastChangeByPage = new Map<string, ProgressAnnotation>();
  for (const annotation of input.annotations) {
    const key = claim(annotation.url);
    if (key && !lastChangeByPage.has(key)) {
      lastChangeByPage.set(key, annotation);
    }
  }
  const siteWideChange = input.annotations.find((a) => a.url === null) ?? null;

  const gscByPage = (rows: ProgressGscRow[]) => {
    const byPage = new Map<string, ProgressGscRow>();
    for (const row of rows) {
      const key = normalizePageUrl(row.url);
      if (key) byPage.set(key, row);
    }
    return byPage;
  };
  const current = input.gsc ? gscByPage(input.gsc.current) : null;
  const previous = input.gsc ? gscByPage(input.gsc.previous) : null;

  const pages: ProgressPage[] = [];
  for (const [key, url] of display) {
    const keywords = keywordsByPage.get(key) ?? [];
    const now = current?.get(key);
    const before = previous?.get(key);
    pages.push({
      url,
      isMain: key === mainKey,
      // Connected but absent from the rows means zero impressions, not unknown.
      gsc: current
        ? {
            clicks: now?.clicks ?? 0,
            impressions: now?.impressions ?? 0,
            position: now?.position ?? 0,
            prevClicks: before?.clicks ?? 0,
            prevImpressions: before?.impressions ?? 0,
          }
        : null,
      keywords,
      top10: {
        now: keywords.filter((k) => inTop(k.position)).length,
        before: keywords.filter((k) => inTop(k.previousPosition)).length,
      },
      lastChange: latestChange(lastChangeByPage.get(key), siteWideChange),
    });
  }

  // Pages with the most tracked keywords first, then alphabetical.
  return sort(
    pages,
    (a, b) =>
      Number(b.isMain) - Number(a.isMain) ||
      b.keywords.length - a.keywords.length ||
      a.url.localeCompare(b.url),
  );
}
