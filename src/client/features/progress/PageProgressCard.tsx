import { Link2 } from "lucide-react";
import { sort } from "remeda";
import { Card, CardContent, CardHeader } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";
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
import type { getProgressReport } from "@/serverFunctions/progress";
import type { inspectProgressPages } from "@/serverFunctions/progress";
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
  return (
    <Card size="lg">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SafeExternalLink
            url={page.url}
            label={pageLabel(page.url)}
            className="inline-flex items-center gap-1 text-base font-semibold hover:underline"
          />
          {indexing ? <IndexingBadge indexing={indexing} /> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {lastChange
            ? `Last change ${formatShortDate(lastChange.date)}: ${lastChange.note}`
            : "No change noted yet"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile
            label="Clicks"
            value={gsc ? formatCount(gsc.clicks) : "—"}
            delta={
              gsc
                ? { current: gsc.clicks, previous: gsc.prevClicks }
                : undefined
            }
            hint={gsc ? undefined : gscConnected ? undefined : "Connect GSC"}
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
            value={
              gsc && gsc.impressions > 0 ? formatPosition(gsc.position) : "—"
            }
          />
          <StatTile
            label="Keywords in top 10"
            value={
              keywords.length > 0 ? `${top10.now} / ${keywords.length}` : "—"
            }
            hint={
              keywords.length > 0 && top10Change !== 0
                ? `${formatChange(top10Change).text} vs first check`
                : undefined
            }
          />
        </div>

        {keywords.length > 0 ? (
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
                  <TableCell>
                    {keyword.checked &&
                    keyword.position === null &&
                    keyword.previousPosition === null ? (
                      <span className="text-xs text-muted-foreground">
                        Not ranking
                      </span>
                    ) : keyword.checked ? (
                      <DeviceRankCell
                        result={{
                          position: keyword.position,
                          previousPosition: keyword.previousPosition,
                          rankingUrl: null,
                          serpFeatures: [],
                        }}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Waiting for first check
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="size-4" />
            No tracked keyword points at this page yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
