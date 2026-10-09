import { describe, expect, it } from "vitest";
import { buildProgressPages, type ProgressKeyword } from "./progressReport";

function keyword(overrides: Partial<ProgressKeyword>): ProgressKeyword {
  return {
    configId: "config",
    trackingKeywordId: overrides.keyword ?? "kw",
    keyword: "kw",
    targetUrl: null,
    searchVolume: null,
    position: null,
    previousPosition: null,
    checked: true,
    ...overrides,
  };
}

describe("buildProgressPages", () => {
  it("matches Search Console rows to target pages despite URL formatting", () => {
    const pages = buildProgressPages({
      keywords: [
        keyword({
          keyword: "nota de empenho",
          targetUrl: "https://doisrios.com/guias/nota-de-empenho",
          position: 8,
          previousPosition: 30,
        }),
      ],
      gsc: {
        current: [
          {
            url: "https://www.doisrios.com/guias/nota-de-empenho/?utm=x",
            clicks: 5,
            impressions: 100,
            position: 9,
          },
        ],
        previous: [],
      },
      annotations: [],
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]?.gsc).toMatchObject({ clicks: 5, impressions: 100 });
    expect(pages[0]?.top10).toEqual({ now: 1, before: 0 });
  });

  it("reports zero for a page Search Console has no rows for, null when not connected", () => {
    const input = {
      keywords: [keyword({ targetUrl: "https://doisrios.com/guias" })],
      annotations: [],
    };

    const connected = buildProgressPages({
      ...input,
      gsc: { current: [], previous: [] },
    });
    const disconnected = buildProgressPages({ ...input, gsc: null });

    expect(connected[0]?.gsc).toMatchObject({ clicks: 0, impressions: 0 });
    expect(disconnected[0]?.gsc).toBeNull();
  });

  it("lists an annotated page without keywords and keeps only the newest note", () => {
    const pages = buildProgressPages({
      keywords: [],
      gsc: null,
      annotations: [
        {
          id: "2",
          date: "2026-10-08",
          note: "Rewrote intro",
          url: "https://doisrios.com/guias/",
        },
        {
          id: "1",
          date: "2026-10-01",
          note: "Published",
          url: "https://doisrios.com/guias",
        },
        { id: "3", date: "2026-10-08", note: "Site-wide", url: null },
      ],
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]?.lastChange?.note).toBe("Rewrote intro");
  });

  it("lets a page inherit a newer site-wide note", () => {
    const pages = buildProgressPages({
      keywords: [keyword({ targetUrl: "https://doisrios.com/guias" })],
      gsc: null,
      annotations: [
        { id: "2", date: "2026-10-08", note: "Edited all pages", url: null },
        {
          id: "1",
          date: "2026-10-01",
          note: "Published",
          url: "https://doisrios.com/guias",
        },
      ],
    });

    expect(pages[0]?.lastChange?.note).toBe("Edited all pages");
  });

  it("always lists the main site first, even without keywords or traffic", () => {
    const pages = buildProgressPages({
      keywords: [keyword({ targetUrl: "https://doisrios.com/guias" })],
      gsc: null,
      annotations: [],
      mainDomain: "doisrios.com",
    });

    expect(pages.map((page) => [page.url, page.isMain])).toEqual([
      ["https://doisrios.com", true],
      ["https://doisrios.com/guias", false],
    ]);
  });
});
