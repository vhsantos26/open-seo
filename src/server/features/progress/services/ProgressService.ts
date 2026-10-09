import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { getLatestResults } from "@/server/features/rank-tracking/services/rankTrackingResults";
import { ProjectContextRepository } from "@/server/features/project-context/repositories/ProjectContextRepository";
import { ProjectContextService } from "@/server/features/project-context/services/ProjectContextService";
import { normalizeBacklinksTarget } from "@/server/lib/dataforseoBacklinksTarget";
import { AppError } from "@/server/lib/errors";
import { DomainService } from "@/server/features/domain/services/DomainService";
import { ProgressRepository } from "@/server/features/progress/repositories/ProgressRepository";
import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import {
  resolveDateRange,
  type GscDateRange,
} from "@/server/features/gsc/searchAnalytics";
import {
  previousPeriod,
  toDimensionRows,
} from "@/server/features/gsc/searchPerformanceReport";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { resolveLabsMarket } from "@/shared/keyword-locations";
import { buildProgressPages, type ProgressKeyword } from "./progressReport";

// A page can only be a target if it matches an annotation or tracked keyword,
// so the GSC fetch only needs to cover the pages that rank at all.
const GSC_PAGE_ROW_LIMIT = 1000;

type ProjectMarket = { locationCode: number; languageCode: string };

function isExpectedConnectionFailure(error: unknown): boolean {
  return error instanceof GscNotConnectedError || isExpectedGrantFailure(error);
}

function normalizeProjectDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

async function getTrackedKeywords(
  projectId: string,
): Promise<ProgressKeyword[]> {
  const configs = (
    await RankTrackingRepository.getConfigsForProject(projectId)
  ).filter((config) => config.isActive);
  // "90d" falls back to each keyword's first check, so a young tracker still
  // gets a baseline to compare against.
  const results = await Promise.all(
    configs.map(async (config) => ({
      config,
      latest: await getLatestResults(config.id, projectId, "90d"),
    })),
  );
  return results.flatMap(({ config, latest }) =>
    latest.rows.map((row) => {
      const device = config.devices === "mobile" ? row.mobile : row.desktop;
      return {
        configId: config.id,
        trackingKeywordId: row.trackingKeywordId,
        keyword: row.keyword,
        targetUrl: row.targetUrl,
        searchVolume: row.searchVolume,
        position: device.position,
        previousPosition: device.previousPosition,
        checked: latest.run !== null && latest.run.lastCheckedAt !== null,
      };
    }),
  );
}

async function getGscPages(projectId: string, dateRange: GscDateRange) {
  const { startDate, endDate } = resolveDateRange({ dateRange });
  const prev = previousPeriod(startDate, endDate);
  const fetchPages = async (range: { startDate: string; endDate: string }) =>
    toDimensionRows(
      (
        await GscService.getPerformance({
          projectId,
          ...range,
          dimensions: ["page"],
          rowLimit: GSC_PAGE_ROW_LIMIT,
        })
      ).rows,
    ).map((row) => ({
      url: row.key,
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
    }));
  try {
    const [current, previous] = await Promise.all([
      fetchPages({ startDate, endDate }),
      fetchPages(prev),
    ]);
    return {
      connected: true as const,
      range: {
        startDate,
        endDate,
        prevStartDate: prev.startDate,
        prevEndDate: prev.endDate,
      },
      rows: { current, previous },
    };
  } catch (error) {
    if (isExpectedConnectionFailure(error)) {
      return { connected: false as const };
    }
    throw error;
  }
}

async function getReport(input: {
  projectId: string;
  projectDomain: string | null;
  dateRange: GscDateRange;
}) {
  const [keywords, annotations, gsc] = await Promise.all([
    getTrackedKeywords(input.projectId),
    ProgressRepository.listAnnotations(input.projectId),
    getGscPages(input.projectId, input.dateRange),
  ]);
  return {
    gscConnected: gsc.connected,
    range: gsc.connected ? gsc.range : null,
    pages: buildProgressPages({
      keywords,
      gsc: gsc.connected ? gsc.rows : null,
      annotations,
      mainDomain: input.projectDomain
        ? normalizeProjectDomain(input.projectDomain)
        : null,
    }),
    annotations,
    // Keywords tracked but not pointed at any page yet.
    unmapped: keywords.filter((keyword) => keyword.targetUrl === null),
  };
}

async function addAnnotation(input: {
  projectId: string;
  date: string;
  note: string;
  url: string | null;
}) {
  await ProgressRepository.insertAnnotation({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    date: input.date,
    note: input.note,
    url: input.url,
  });
}

async function removeAnnotation(projectId: string, id: string) {
  await ProgressRepository.deleteAnnotation(projectId, id);
}

// ---------------------------------------------------------------------------
// Competitor benchmark
// ---------------------------------------------------------------------------

async function getBenchmarkDomains(
  projectId: string,
  projectDomain: string | null,
) {
  const competitors = await ProjectContextRepository.listCompetitors(projectId);
  // Stored project domains are already bare hosts; this only guards a stray
  // www. so the row matches the snapshots written for it.
  const own = projectDomain ? normalizeProjectDomain(projectDomain) : null;
  return [
    ...(own ? [{ domain: own, name: null, isOwn: true }] : []),
    ...competitors.map((competitor) => ({
      domain: competitor.domain,
      name: competitor.name,
      isOwn: false,
    })),
  ];
}

async function getBenchmark(input: {
  projectId: string;
  projectDomain: string | null;
}) {
  const domains = await getBenchmarkDomains(
    input.projectId,
    input.projectDomain,
  );
  const snapshots = await ProgressRepository.listDomainSnapshots(
    input.projectId,
    domains.map((entry) => entry.domain),
  );
  // Newest first, so the first two rows per domain are latest and previous.
  return domains.map((entry) => {
    const own = snapshots.filter((snap) => snap.domain === entry.domain);
    return { ...entry, latest: own[0] ?? null, previous: own[1] ?? null };
  });
}

/**
 * Fetches a Domain Overview for one domain and stores it as a snapshot. Goes
 * through DomainService, so a result that is still cached costs nothing;
 * otherwise it is one metered DataForSEO call. Returns false when DataForSEO
 * has no data for the domain, so nothing is stored.
 */
async function snapshotDomain(
  projectId: string,
  domain: string,
  market: { locationCode: number; languageCode: string },
  billingCustomer: BillingCustomerContext,
) {
  const overview = await DomainService.getOverview(
    { projectId, domain, ...market },
    billingCustomer,
  );
  if (!overview.hasData) return false;
  await ProgressRepository.insertDomainSnapshot({
    projectId,
    domain,
    ...market,
    organicTraffic: overview.organicTraffic ?? null,
    organicKeywords: overview.organicKeywords ?? null,
    // The data's own date: a cached overview is older than this request.
    capturedAt: overview.fetchedAt,
  });
  return true;
}

/**
 * Refreshes the project's own domain and every competitor. One bad domain does
 * not stop the rest.
 */
async function refreshBenchmark(
  input: {
    projectId: string;
    projectDomain: string | null;
    project: ProjectMarket;
  },
  billingCustomer: BillingCustomerContext,
) {
  const domains = await getBenchmarkDomains(
    input.projectId,
    input.projectDomain,
  );
  const market = resolveLabsMarket({}, input.project);
  const failed: string[] = [];
  for (const entry of domains) {
    try {
      await snapshotDomain(
        input.projectId,
        entry.domain,
        market,
        billingCustomer,
      );
    } catch (error) {
      console.error("progress: benchmark refresh failed", entry.domain, error);
      failed.push(entry.domain);
    }
  }
  return { failed };
}

/**
 * Saves a domain as a competitor and stores its first snapshot. Called right
 * after the domain was looked up in Domain Overview, so the snapshot normally
 * comes from that lookup's cache and costs nothing.
 */
async function trackCompetitor(
  input: {
    projectId: string;
    projectDomain: string | null;
    domain: string;
    locationCode?: number;
    project: ProjectMarket;
  },
  billingCustomer: BillingCustomerContext,
) {
  const domain = normalizeBacklinksTarget(input.domain, {
    scope: "domain",
  }).apiTarget;
  if (
    input.projectDomain &&
    domain === normalizeProjectDomain(input.projectDomain)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This is your own domain, not a competitor.",
    );
  }
  await ProjectContextService.applyContextUpdates(
    input.projectId,
    [{ addCompetitors: [{ domain }] }],
    "user",
  );
  const market = resolveLabsMarket(
    { locationCode: input.locationCode },
    input.project,
  );
  const snapshotSaved = await snapshotDomain(
    input.projectId,
    domain,
    market,
    billingCustomer,
  );
  return { domain, snapshotSaved };
}

// ---------------------------------------------------------------------------
// Indexing
// ---------------------------------------------------------------------------

async function inspectPages(projectId: string, urls: string[]) {
  const inspected = await GscService.inspectUrls({ projectId, urls });
  return inspected.results.map(({ url, result, error }) => ({
    url,
    error: error ?? null,
    verdict: result?.indexStatusResult?.verdict ?? null,
    coverageState: result?.indexStatusResult?.coverageState ?? null,
    lastCrawlTime: result?.indexStatusResult?.lastCrawlTime ?? null,
  }));
}

export const ProgressService = {
  getReport,
  addAnnotation,
  removeAnnotation,
  getBenchmark,
  refreshBenchmark,
  trackCompetitor,
  inspectPages,
};
