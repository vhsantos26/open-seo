import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOverviewMock, applyContextUpdatesMock, insertDomainSnapshotMock } =
  vi.hoisted(() => ({
    getOverviewMock: vi.fn(),
    applyContextUpdatesMock: vi.fn(),
    insertDomainSnapshotMock: vi.fn(),
  }));

vi.mock("@/server/features/domain/services/DomainService", () => ({
  DomainService: { getOverview: getOverviewMock },
}));
vi.mock(
  "@/server/features/project-context/services/ProjectContextService",
  () => ({
    ProjectContextService: { applyContextUpdates: applyContextUpdatesMock },
  }),
);
vi.mock("@/server/features/progress/repositories/ProgressRepository", () => ({
  ProgressRepository: { insertDomainSnapshot: insertDomainSnapshotMock },
}));
// The rank tracking and GSC modules load the Workers runtime; they are not
// exercised here.
vi.mock(
  "@/server/features/rank-tracking/repositories/RankTrackingRepository",
  () => ({
    RankTrackingRepository: {},
  }),
);
vi.mock("@/server/features/rank-tracking/services/rankTrackingResults", () => ({
  getLatestResults: vi.fn(),
}));
vi.mock(
  "@/server/features/project-context/repositories/ProjectContextRepository",
  () => ({
    ProjectContextRepository: {},
  }),
);
vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscNotConnectedError: class extends Error {},
  GscService: {},
  isExpectedGrantFailure: () => false,
}));

import { ProgressService } from "./ProgressService";

const input = {
  projectId: "project-1",
  projectDomain: "doisrios.com",
  project: { locationCode: 2076, languageCode: "pt" },
};
const billingCustomer = {
  organizationId: "org",
  userId: "user",
  userEmail: "a@example.com",
};

describe("ProgressService.trackCompetitor", () => {
  beforeEach(() => {
    getOverviewMock.mockResolvedValue({
      hasData: true,
      organicTraffic: 1054,
      organicKeywords: 277,
    });
  });

  it("saves the competitor and its first traffic snapshot", async () => {
    const result = await ProgressService.trackCompetitor(
      { ...input, domain: "https://www.LicitaJa.com.br/precos" },
      billingCustomer,
    );

    expect(result).toEqual({ domain: "licitaja.com.br", snapshotSaved: true });
    expect(applyContextUpdatesMock).toHaveBeenCalledWith(
      "project-1",
      [{ addCompetitors: [{ domain: "licitaja.com.br" }] }],
      "user",
    );
    expect(insertDomainSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: "licitaja.com.br",
        organicTraffic: 1054,
        organicKeywords: 277,
      }),
    );
  });

  it("refuses the project's own domain before writing anything", async () => {
    await expect(
      ProgressService.trackCompetitor(
        { ...input, domain: "www.doisrios.com" },
        billingCustomer,
      ),
    ).rejects.toThrow("your own domain");

    expect(applyContextUpdatesMock).not.toHaveBeenCalled();
  });
});
