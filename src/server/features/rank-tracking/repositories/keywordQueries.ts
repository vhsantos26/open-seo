import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { rankTrackingConfigs, rankTrackingKeywords } from "@/db/schema";

export async function getKeywordsForConfig(configId: string) {
  return db
    .select()
    .from(rankTrackingKeywords)
    .where(eq(rankTrackingKeywords.configId, configId))
    .orderBy(rankTrackingKeywords.createdAt);
}

/** A project's most important tracked keywords: pinned first, then by search volume. */
export async function getTopKeywordsForProject(
  projectId: string,
  limit: number,
) {
  const volume = max(rankTrackingKeywords.searchVolume);
  const rows = await db
    .select({ keyword: rankTrackingKeywords.keyword })
    .from(rankTrackingKeywords)
    .innerJoin(
      rankTrackingConfigs,
      eq(rankTrackingConfigs.id, rankTrackingKeywords.configId),
    )
    .where(
      and(
        eq(rankTrackingConfigs.projectId, projectId),
        eq(rankTrackingConfigs.isActive, true),
      ),
    )
    .groupBy(rankTrackingKeywords.keyword)
    // CASE puts nulls last in both SQLite and Postgres.
    .orderBy(
      sql`min(CASE WHEN ${rankTrackingKeywords.pinnedAt} IS NULL THEN 1 ELSE 0 END)`,
      sql`CASE WHEN ${volume} IS NULL THEN 1 ELSE 0 END`,
      desc(volume),
      asc(rankTrackingKeywords.keyword),
    )
    .limit(limit);
  return rows.map((row) => row.keyword);
}

export async function addKeywordsToConfig(
  keywords: (typeof rankTrackingKeywords.$inferInsert)[],
) {
  const insertedIds: string[] = [];

  // Keep each statement below D1's bound-parameter limit and return only rows
  // that actually won the unique(config_id, keyword) race.
  const insertBatchSize = 25;
  for (let i = 0; i < keywords.length; i += insertBatchSize) {
    const chunk = keywords.slice(i, i + insertBatchSize);
    const inserted = await db
      .insert(rankTrackingKeywords)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: rankTrackingKeywords.id });
    insertedIds.push(...inserted.map((row) => row.id));
  }

  return insertedIds;
}

export async function removeKeywordsFromConfig(
  keywordIds: string[],
  configId: string,
) {
  if (keywordIds.length === 0) return [];

  const removedIds: string[] = [];
  // One extra bind is used by configId; keep each IN list below D1's ~100
  // parameter ceiling while preserving the config ownership predicate.
  const deleteBatchSize = 90;
  for (let i = 0; i < keywordIds.length; i += deleteBatchSize) {
    const chunk = keywordIds.slice(i, i + deleteBatchSize);
    const removed = await db
      .delete(rankTrackingKeywords)
      .where(
        and(
          inArray(rankTrackingKeywords.id, chunk),
          eq(rankTrackingKeywords.configId, configId),
        ),
      )
      .returning({ id: rankTrackingKeywords.id });
    removedIds.push(...removed.map((row) => row.id));
  }
  return removedIds;
}

export async function setKeywordsPinned(
  keywordIds: string[],
  configId: string,
  pinned: boolean,
) {
  const pinnedAt = pinned ? new Date().toISOString() : null;
  const updatedIds: string[] = [];
  // Same IN-list ceiling as removeKeywordsFromConfig, plus two binds for
  // configId and pinnedAt.
  const updateBatchSize = 90;
  for (let i = 0; i < keywordIds.length; i += updateBatchSize) {
    const chunk = keywordIds.slice(i, i + updateBatchSize);
    const updated = await db
      .update(rankTrackingKeywords)
      .set({ pinnedAt })
      .where(
        and(
          inArray(rankTrackingKeywords.id, chunk),
          eq(rankTrackingKeywords.configId, configId),
        ),
      )
      .returning({ id: rankTrackingKeywords.id });
    updatedIds.push(...updated.map((row) => row.id));
  }
  return updatedIds;
}

export async function setKeywordsTargetUrl(
  keywordIds: string[],
  configId: string,
  targetUrl: string | null,
) {
  const updatedIds: string[] = [];
  // Same IN-list ceiling as setKeywordsPinned.
  const updateBatchSize = 90;
  for (let i = 0; i < keywordIds.length; i += updateBatchSize) {
    const chunk = keywordIds.slice(i, i + updateBatchSize);
    const updated = await db
      .update(rankTrackingKeywords)
      .set({ targetUrl })
      .where(
        and(
          inArray(rankTrackingKeywords.id, chunk),
          eq(rankTrackingKeywords.configId, configId),
        ),
      )
      .returning({ id: rankTrackingKeywords.id });
    updatedIds.push(...updated.map((row) => row.id));
  }
  return updatedIds;
}
