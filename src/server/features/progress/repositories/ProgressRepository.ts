import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { domainSnapshots, projectAnnotations } from "@/db/schema";

async function listAnnotations(projectId: string) {
  return db
    .select()
    .from(projectAnnotations)
    .where(eq(projectAnnotations.projectId, projectId))
    .orderBy(desc(projectAnnotations.date), desc(projectAnnotations.createdAt));
}

async function insertAnnotation(
  values: typeof projectAnnotations.$inferInsert,
) {
  await db.insert(projectAnnotations).values(values);
}

async function deleteAnnotation(projectId: string, id: string) {
  await db
    .delete(projectAnnotations)
    .where(
      and(
        eq(projectAnnotations.projectId, projectId),
        eq(projectAnnotations.id, id),
      ),
    );
}

async function listDomainSnapshots(projectId: string, domains: string[]) {
  if (domains.length === 0) return [];
  return (
    db
      .select()
      .from(domainSnapshots)
      .where(
        and(
          eq(domainSnapshots.projectId, projectId),
          inArray(domainSnapshots.domain, domains),
        ),
      )
      // id, not capturedAt: autoincrement is monotonic and immune to the
      // sqlite-vs-pg timestamp text-format difference.
      .orderBy(desc(domainSnapshots.id))
  );
}

async function insertDomainSnapshot(
  values: typeof domainSnapshots.$inferInsert,
) {
  await db.insert(domainSnapshots).values(values);
}

export const ProgressRepository = {
  listAnnotations,
  insertAnnotation,
  deleteAnnotation,
  listDomainSnapshots,
  insertDomainSnapshot,
};
