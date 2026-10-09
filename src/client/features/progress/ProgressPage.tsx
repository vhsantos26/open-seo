import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScanSearch } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryError } from "@/client/components/QueryState";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  getProgressReport,
  inspectProgressPages,
} from "@/serverFunctions/progress";
import { AnnotationsCard } from "./AnnotationsCard";
import { BenchmarkCard } from "./BenchmarkCard";
import { PageProgressCard, type PageIndexing } from "./PageProgressCard";
import { UnmappedKeywordsCard } from "./UnmappedKeywordsCard";

const RANGES = [
  { value: "last_7_days", label: "7 days" },
  { value: "last_28_days", label: "28 days" },
  { value: "last_3_months", label: "3 months" },
] as const;
type Range = (typeof RANGES)[number]["value"];

export function ProgressPage({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<Range>("last_28_days");
  const [indexing, setIndexing] = useState<Record<string, PageIndexing>>({});

  const reportQuery = useQuery({
    queryKey: ["progressReport", projectId, range],
    queryFn: () => getProgressReport({ data: { projectId, dateRange: range } }),
  });
  const report = reportQuery.data;
  const pageUrls = report?.pages.map((page) => page.url) ?? [];
  const mainPage = report?.pages.find((page) => page.isMain);
  const otherPages = report?.pages.filter((page) => !page.isMain) ?? [];

  const inspectMutation = useMutation({
    mutationFn: () =>
      inspectProgressPages({
        data: { projectId, urls: pageUrls.slice(0, 20) },
      }),
    onSuccess: (results) => {
      setIndexing(Object.fromEntries(results.map((r) => [r.url, r])));
      toast.success("Indexing checked");
    },
  });

  if (reportQuery.isError && !report) {
    return (
      <QueryError
        error={reportQuery.error}
        fallback="Failed to load progress"
        onRetry={() => void reportQuery.refetch()}
        isRetrying={reportQuery.isFetching}
      />
    );
  }

  if (!report) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedToggle
          showLabels
          items={RANGES.map((option) => ({
            value: option.value,
            icon: null,
            label: option.label,
          }))}
          value={range}
          onChange={setRange}
        />
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          disabled={
            !report.gscConnected ||
            pageUrls.length === 0 ||
            inspectMutation.isPending
          }
          onClick={() => inspectMutation.mutate()}
          title={
            report.gscConnected
              ? "Ask Google whether each page is indexed (free)"
              : "Connect Google Search Console to check indexing"
          }
        >
          <ScanSearch data-icon="inline-start" />
          Check indexing
        </Button>
      </div>

      {report.range ? (
        <p className="-mt-3 text-xs text-muted-foreground">
          Clicks and impressions: {report.range.startDate} to{" "}
          {report.range.endDate}, compared with {report.range.prevStartDate} to{" "}
          {report.range.prevEndDate}. Search Console data trails by 2 to 3 days.
          Rank changes compare with each keyword&rsquo;s first check.
        </p>
      ) : (
        <p className="-mt-3 text-xs text-muted-foreground">
          Connect Google Search Console to see clicks and impressions per page.
        </p>
      )}

      {report.pages.length === 0 ? (
        <EmptyState
          title="No pages to follow yet"
          description="Point tracked keywords at the page that should rank for them, or add a note about a page change. Pages then appear here with their rankings and traffic."
        />
      ) : null}

      {/* The main site and the change log sit together at the top; the other
          pages are compact cards below so the list stays short. */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        {mainPage ? (
          <PageProgressCard
            page={mainPage}
            indexing={indexing[mainPage.url]}
            gscConnected={report.gscConnected}
          />
        ) : null}
        <AnnotationsCard
          projectId={projectId}
          annotations={report.annotations}
          pageUrls={pageUrls}
          onChanged={() =>
            void queryClient.invalidateQueries({ queryKey: ["progressReport"] })
          }
        />
      </div>

      {otherPages.length > 0 ? (
        <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {otherPages.map((page) => (
            <PageProgressCard
              key={page.url}
              page={page}
              indexing={indexing[page.url]}
              gscConnected={report.gscConnected}
            />
          ))}
        </div>
      ) : null}

      <div
        className={`grid items-start gap-5 ${report.unmapped.length > 0 ? "lg:grid-cols-2" : ""}`}
      >
        <BenchmarkCard projectId={projectId} />
        <UnmappedKeywordsCard
          projectId={projectId}
          keywords={report.unmapped}
          pageUrls={pageUrls}
        />
      </div>
    </div>
  );
}
