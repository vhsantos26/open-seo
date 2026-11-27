import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

// Dated notes on what changed on the site ("rewrote the intro", "published the
// guide"), optionally tied to one page, so the progress view can line a change
// up against the ranking and traffic that followed. `date` is the day the change
// happened (YYYY-MM-DD), chosen by the user, not the day the note was written.
export const projectAnnotations = sqliteTable(
  "project_annotations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    note: text("note").notNull(),
    url: text("url"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("project_annotations_project_date_idx").on(
      table.projectId,
      table.date,
    ),
  ],
);

// Point-in-time organic traffic estimates for the project's own domain and its
// competitors, written when a benchmark refresh runs. Domain Overview results
// are only cached for hours, so this is the durable history. The domain is
// stored per row so removing a competitor doesn't rewrite history.
export const domainSnapshots = sqliteTable(
  "domain_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    locationCode: integer("location_code").notNull(),
    languageCode: text("language_code").notNull(),
    organicTraffic: integer("organic_traffic"),
    organicKeywords: integer("organic_keywords"),
    capturedAt: text("captured_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("domain_snapshots_project_domain_captured_idx").on(
      table.projectId,
      table.domain,
      table.capturedAt,
    ),
  ],
);
