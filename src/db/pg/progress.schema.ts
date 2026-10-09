import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { projects } from "./app.schema";

// Same text-timestamp convention as app.schema.ts (see the note there).
const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const timestampColumn = (name: string) => text(name);

// Point-in-time backlink profile summaries for the project's own domain,
// written by the dashboard's visit-triggered refresh. DataForSEO's summary
// already carries new/lost counts, so one snapshot renders a full card;
// rows accumulate into history for future trend views. The domain is stored
// per row so a later project-domain change doesn't rewrite history.
export const backlinkSnapshots = pgTable(
  "backlink_snapshots",
  {
    id: serial("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    rank: integer("rank"),
    backlinks: bigint("backlinks", { mode: "number" }),
    referringDomains: bigint("referring_domains", { mode: "number" }),
    brokenBacklinks: bigint("broken_backlinks", { mode: "number" }),
    newBacklinks: bigint("new_backlinks", { mode: "number" }),
    lostBacklinks: bigint("lost_backlinks", { mode: "number" }),
    newReferringDomains: bigint("new_referring_domains", { mode: "number" }),
    lostReferringDomains: bigint("lost_referring_domains", { mode: "number" }),
    capturedAt: timestampColumn("captured_at").notNull().default(isoNow),
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
export const projectAnnotations = pgTable(
  "project_annotations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    note: text("note").notNull(),
    url: text("url"),
    createdAt: timestampColumn("created_at").notNull().default(isoNow),
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
export const domainSnapshots = pgTable(
  "domain_snapshots",
  {
    id: serial("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    locationCode: integer("location_code").notNull(),
    languageCode: text("language_code").notNull(),
    organicTraffic: bigint("organic_traffic", { mode: "number" }),
    organicKeywords: bigint("organic_keywords", { mode: "number" }),
    capturedAt: timestampColumn("captured_at").notNull().default(isoNow),
  },
  (table) => [
    index("domain_snapshots_project_domain_captured_idx").on(
      table.projectId,
      table.domain,
      table.capturedAt,
    ),
  ],
);
