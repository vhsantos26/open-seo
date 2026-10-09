import { ChevronDown, Link2 } from "lucide-react";
import { sort } from "remeda";
import { Badge } from "@/client/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/client/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { StatTile } from "@/client/components/StatTile";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { DeviceRankCell } from "@/client/features/rank-tracking/RankTrackingTableParts";
import {
  formatCount,
  formatPosition,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import type {
  getProgressReport,
  inspectProgressPages,
} from "@/serverFunctions/progress";
import { formatChange, formatShortDate, pageLabel } from "./progressFormat";

type Report = Awaited<ReturnType<typeof getProgressReport>>;
type ProgressPage = Report["pages"][number];
export type PageIndexing = Awaited<
  ReturnType<typeof inspectProgressPages>
>[number];

function IndexingBadge({ indexing }: { indexing: PageIndexing }) {
  if (indexing.error) {
    return (
      <Badge variant="outline" title={indexing.error}>
        Check failed
      </Badge>
    );
  }
  const indexed = indexing.verdict === "PASS";
  return (
    <Badge
      variant={indexed ? "success" : "outline"}
      title={
        indexing.lastCrawlTime
          ? `Last crawl ${indexing.lastCrawlTime}`
          : undefined
      }
    >
      {indexed ? "Indexed" : (indexing.coverageState ?? "Not indexed")}
    </Badge>
  );
}

function KeywordsTable({ keywords }: { keywords: ProgressPage["keywords"] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead className="text-right">Volume</TableHead>
          <TableHead>Position</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sort(
          keywords,
          (a, b) =>
            (b.searchVolume ?? -1) - (a.searchVolume ?? -1) ||
            a.keyword.localeCompare(b.keyword),
        ).map((keyword) => (
          <TableRow key={keyword.trackingKeywordId}>
            <TableCell>{keyword.keyword}</TableCell>
            <TableCell className="text-right tabular-nums">
              {keyword.searchVolume === null
                ? "—"
                : formatCount(keyword.searchVolume)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {!keyword.checked ? (
                <span className="text-xs text-muted-foreground">
                  Waiting for first check
                </span>
              ) : keyword.position === null &&
                keyword.previousPosition === null ? (
                <span className="text-xs text-muted-foreground">
                  Not ranking
                </span>
              ) : (
                <DeviceRankCell
                  result={{
                    position: keyword.position,
                    previousPosition: keyword.previousPosition,
                    rankingUrl: null,
                    serpFeatures: [],
                  }}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * One page's progress. The main page (the project's home) renders in full;
 * every other page is compact, with its keywords behind an expander so a long
 * list of pages stays scannable.
 */
export function PageProgressCard({
  page,
  indexing,
  gscConnected,
}: {
  page: ProgressPage;
  indexing: PageIndexing | undefined;
  gscConnected: boolean;
}) {
  const { gsc, keywords, top10, lastChange } = page;
  const top10Change = top10.now - top10.before;
  const stats = (
    <div
      className={
        page.isMain
          ? "grid grid-cols-2 gap-4 xl:grid-cols-4"
          : "grid grid-cols-2 gap-4"
      }
    >
      <StatTile
        label="Clicks"
        value={gsc ? formatCount(gsc.clicks) : "—"}
        delta={
          gsc ? { current: gsc.clicks, previous: gsc.prevClicks } : undefined
        }
        hint={gsc || gscConnected ? undefined : "Connect GSC"}
      />
      <StatTile
        label="Impressions"
        value={gsc ? formatCount(gsc.impressions) : "—"}
        delta={
          gsc
            ? { current: gsc.impressions, previous: gsc.prevImpressions }
            : undefined
        }
      />
      <StatTile
        label="Avg position"
        value={gsc && gsc.impressions > 0 ? formatPosition(gsc.position) : "—"}
      />
      <StatTile
        label="Top 10"
        value={keywords.length > 0 ? `${top10.now} / ${keywords.length}` : "—"}
        hint={
          keywords.length > 0 && top10Change !== 0
            ? `${formatChange(top10Change).text} vs first check`
            : undefined
        }
      />
    </div>
  );

  const keywordsBody =
    keywords.length > 0 ? (
      <KeywordsTable keywords={keywords} />
    ) : (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link2 className="size-4" />
        No tracked keyword points at this page yet.
      </p>
    );

  return (
    <Card size={page.isMain ? "lg" : "default"} className="h-full">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SafeExternalLink
            url={page.url}
            label={pageLabel(page.url)}
            className={
              page.isMain
                ? "inline-flex items-center gap-1 text-lg font-semibold hover:underline"
                : "inline-flex min-w-0 items-center gap-1 text-sm font-semibold hover:underline"
            }
          />
          {page.isMain ? <Badge variant="soft">Main site</Badge> : null}
          {indexing ? <IndexingBadge indexing={indexing} /> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {lastChange
            ? `Last change ${formatShortDate(lastChange.date)}: ${lastChange.note}`
            : "No change noted yet"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats}
        {page.isMain ? (
          keywordsBody
        ) : (
          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground">
              Keywords ({keywords.length})
              <ChevronDown className="size-4 transition-transform group-data-[panel-open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              {keywordsBody}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
