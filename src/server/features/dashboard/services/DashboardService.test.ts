import { beforeEach, describe, expect, it, vi } from "vitest";

const { latestMock, historyMock, insertMock, summaryMock, domainsMock } =
  vi.hoisted(() => ({
    latestMock: vi.fn(),
    historyMock: vi.fn(),
    insertMock: vi.fn(),
    summaryMock: vi.fn(),
    domainsMock: vi.fn(),
  }));

vi.mock(
  "@/server/features/dashboard/repositories/BacklinkSnapshotRepository",
  () => ({
    BacklinkSnapshotRepository: {
      getLatestForProject: latestMock,
      listHistory: historyMock,
      insert: insertMock,
    },
  }),
);
vi.mock("@/server/lib/dataforseo", () => ({
  normalizeBacklinksTarget: () => ({
    apiTarget: "doisrios.com",
    includeSubdomains: true,
  }),
  createDataforseoClient: () => ({
    backlinks: { summary: summaryMock, referringDomains: domainsMock },
  }),
}));
// Loaded by the service but not exercised here; they pull in the Workers runtime.
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: {},
}));
vi.mock(
  "@/server/features/activation/repositories/ActivationRepository",
  () => ({
    ActivationRepository: {},
  }),
);
vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: {},
}));
vi.mock("@/server/features/audit/repositories/auditSummaryQueries", () => ({}));
vi.mock("@/server/features/ga4/repositories/Ga4ConnectionRepository", () => ({
  Ga4ConnectionRepository: {},
}));
vi.mock("@/server/features/gsc/repositories/GscConnectionRepository", () => ({
  GscConnectionRepository: {},
}));

import { DashboardService } from "./DashboardService";

const HOUR = 60 * 60 * 1000;
const billingCustomer = {
  organizationId: "org",
  userId: "user",
  userEmail: "a@example.com",
};

function snapshot(ageMs: number, qualityReferringDomains: number | null) {
  return {
    domain: "doisrios.com",
    capturedAt: new Date(Date.now() - ageMs).toISOString(),
    qualityReferringDomains,
  };
}

function ensure() {
  return DashboardService.ensureBacklinkSnapshot({
    projectId: "project-1",
    domain: "doisrios.com",
    billingCustomer,
  });
}

describe("ensureBacklinkSnapshot", () => {
  beforeEach(() => {
    historyMock.mockResolvedValue([]);
    summaryMock.mockResolvedValue({ referring_domains: 1119, backlinks: 1153 });
    domainsMock.mockResolvedValue({ items: [], totalCount: 42 });
  });

  it("keeps a recent snapshot that already has the quality count", async () => {
    latestMock.mockResolvedValue(snapshot(2 * HOUR, 40));

    await ensure();

    expect(summaryMock).not.toHaveBeenCalled();
  });

  it("fills in a missing quality count after an hour and stores it", async () => {
    latestMock.mockResolvedValue(snapshot(2 * HOUR, null));

    await ensure();

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ qualityReferringDomains: 42 }),
    );
  });

  it("does not retry a missing quality count within the hour", async () => {
    latestMock.mockResolvedValue(snapshot(10 * 60 * 1000, null));

    await ensure();

    expect(summaryMock).not.toHaveBeenCalled();
  });

  it("still stores the snapshot when the quality call fails", async () => {
    latestMock.mockResolvedValue(snapshot(30 * HOUR, 40));
    domainsMock.mockRejectedValue(new Error("boom"));

    await ensure();

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referringDomains: 1119,
        qualityReferringDomains: null,
      }),
    );
  });
});
