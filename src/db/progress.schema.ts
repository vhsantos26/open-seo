import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { projects } from "./app.schema";

// Point-in-time backlink profile summaries for the project's own domain,
// written by the dashboard's visit-triggered refresh. DataForSEO's summary
// already carries new/lost counts, so one snapshot renders a full card;
// rows accumulate into history for future trend views. The domain is stored
// per row so a later project-domain change doesn't rewrite history.
export const backlinkSnapshots = sqliteTable(
  "backlink_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    rank: integer("rank"),
    backlinks: integer("backlinks"),
    referringDomains: integer("referring_domains"),
    brokenBacklinks: integer("broken_backlinks"),
    newBacklinks: integer("new_backlinks"),
    lostBacklinks: integer("lost_backlinks"),
    newReferringDomains: integer("new_referring_domains"),
    lostReferringDomains: integer("lost_referring_domains"),
    capturedAt: text("captured_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("backlink_snapshots_project_captured_idx").on(
      table.projectId,
      table.capturedAt,
    ),
  ],
);

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
