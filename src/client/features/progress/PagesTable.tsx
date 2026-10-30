import { Fragment, useState } from "react";
import { ChevronRight, Link2 } from "lucide-react";
import { sort } from "remeda";
import { CardShell } from "@/client/components/CardShell";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  formatCount,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import type { getProgressReport } from "@/serverFunctions/progress";
import {
  IndexingBadge,
  KeywordsTable,
  type PageIndexing,
} from "./PageProgressCard";
import { formatChange, formatShortDate, pageLabel } from "./progressFormat";

type Report = Awaited<ReturnType<typeof getProgressReport>>;
type ProgressPage = Report["pages"][number];
type Filter = "all" | "not_indexed";

const COLUMNS = 7;

/** "/guias/ata" for "/guias/ata/adesao": the guide a page belongs to. */
function hubPath(path: string) {
  return path.split("/").slice(0, 3).join("/");
}

function isNotIndexed(indexing: PageIndexing | undefined) {
  return (
    indexing !== undefined && !indexing.error && indexing.verdict !== "PASS"
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const { text, tone } = formatChange(current - previous);
  if (tone === "flat") return null;
  return (
    <span
      className={`ml-1.5 text-xs ${tone === "good" ? "text-success" : "text-destructive"}`}
    >
      {text}
    </span>
  );
}

/**
 * Every page except the main site, one row each. Paths sort alphabetically so a
 * guide's pages sit right under its hub page, indented. The keywords of a page
 * open under its row, and once indexing has been checked the table can be cut
 * down to the pages Google has not indexed.
 */
export function PagesTable({
  pages,
  indexing,
  gscConnected,
}: {
  pages: ProgressPage[];
  indexing: Record<string, PageIndexing>;
  gscConnected: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const rows = sort(
    pages.map((page) => ({ page, path: pageLabel(page.url) })),
    (a, b) => a.path.localeCompare(b.path),
  );
  const paths = new Set(rows.map((row) => row.path));

  const checked = Object.keys(indexing).length > 0;
  const notIndexed = pages.filter((page) =>
    isNotIndexed(indexing[page.url]),
  ).length;
  const failed = pages.filter((page) => indexing[page.url]?.error).length;
  const visible =
    filter === "not_indexed"
      ? rows.filter((row) => isNotIndexed(indexing[row.page.url]))
      : rows;

  const toggle = (url: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(url)) next.add(url);
      return next;
    });

  return (
    <CardShell
      title={`Pages (${pages.length})`}
      action={
        checked ? (
          <SegmentedToggle
            showLabels
            items={[
              { value: "all", icon: null, label: "All" },
              {
                value: "not_indexed",
                icon: null,
                label: `Not indexed (${notIndexed})`,
              },
            ]}
            value={filter}
            onChange={setFilter}
          />
        ) : undefined
      }
    >
      {checked ? (
        <p className="pb-3 text-xs text-muted-foreground">
          {pages.length - notIndexed - failed} indexed, {notIndexed} not indexed
          {failed > 0 ? `, ${failed} could not be checked` : ""}. Status is from
          Google&rsquo;s index as of the last crawl.
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Page</TableHead>
            <TableHead>Indexing</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">Avg position</TableHead>
            <TableHead className="text-right">Top 10</TableHead>
            <TableHead>Last change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS}
                className="py-6 text-center text-sm text-muted-foreground"
              >
                Every checked page is indexed.
              </TableCell>
            </TableRow>
          ) : null}
          {visible.map(({ page, path }) => {
            const { gsc, keywords, top10, lastChange } = page;
            const hub = hubPath(path);
            const isChild = path !== hub && paths.has(hub);
            const isOpen = open.has(page.url);
            return (
              <Fragment key={page.url}>
                <TableRow>
                  <TableCell className={isChild ? "pl-8" : undefined}>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${isOpen ? "Hide" : "Show"} keywords for ${path}`}
                        aria-expanded={isOpen}
                        onClick={() => toggle(page.url)}
                      >
                        <ChevronRight
                          className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                      </Button>
                      <SafeExternalLink
                        url={page.url}
                        label={isChild ? path.slice(hub.length + 1) : path}
                        className={`inline-flex min-w-0 items-center gap-1 text-sm hover:underline ${isChild ? "" : "font-semibold"}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {indexing[page.url] ? (
                      <IndexingBadge indexing={indexing[page.url]} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {gsc ? formatCount(gsc.clicks) : "—"}
                    {gsc ? (
                      <Delta current={gsc.clicks} previous={gsc.prevClicks} />
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {gsc ? formatCount(gsc.impressions) : "—"}
                    {gsc ? (
                      <Delta
                        current={gsc.impressions}
                        previous={gsc.prevImpressions}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {gsc && gsc.impressions > 0
                      ? formatPosition(gsc.position)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {keywords.length > 0
                      ? `${top10.now} / ${keywords.length}`
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                    {lastChange
                      ? `${formatShortDate(lastChange.date)}: ${lastChange.note}`
                      : "—"}
                  </TableCell>
                </TableRow>
                {isOpen ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMNS} className="bg-muted/30 p-4">
                      {keywords.length > 0 ? (
                        <KeywordsTable keywords={keywords} />
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Link2 className="size-4" />
                          No tracked keyword points at this page yet.
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      {!gscConnected ? (
        <p className="pt-3 text-xs text-muted-foreground">
          Connect Google Search Console to see clicks, impressions and indexing.
        </p>
      ) : null}
    </CardShell>
  );
}
