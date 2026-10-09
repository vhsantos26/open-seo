import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CardShell } from "@/client/components/CardShell";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatCount } from "@/client/features/search-performance/SearchPerformanceColumns";
import {
  getProgressBenchmark,
  refreshProgressBenchmark,
} from "@/serverFunctions/progress";
import { formatChange, formatShortDate } from "./progressFormat";

function TrafficChange({
  latest,
  previous,
}: {
  latest: number | null;
  previous: number | null;
}) {
  if (latest === null || previous === null) return null;
  const { text, tone } = formatChange(latest - previous);
  if (tone === "flat") return null;
  return (
    <span
      className={
        tone === "good"
          ? "ml-2 text-xs text-success"
          : "ml-2 text-xs text-destructive"
      }
    >
      {text}
    </span>
  );
}

export function BenchmarkCard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const benchmarkQuery = useQuery({
    queryKey: ["progressBenchmark", projectId],
    queryFn: () => getProgressBenchmark({ data: { projectId } }),
  });
  const refreshMutation = useMutation({
    mutationFn: () => refreshProgressBenchmark({ data: { projectId } }),
    onSuccess: (result) => {
      setConfirming(false);
      void queryClient.invalidateQueries({
        queryKey: ["progressBenchmark", projectId],
      });
      if (result.failed.length > 0) {
        toast.error(`Could not refresh: ${result.failed.join(", ")}`);
      } else {
        toast.success("Benchmark updated");
      }
    },
    onError: () => setConfirming(false),
  });

  const rows = benchmarkQuery.data ?? [];

  return (
    <CardShell
      title="Competitors"
      stamp="Organic traffic and keywords are DataForSEO estimates, not measurements."
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
          disabled={rows.length === 0}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add competitors in Context and they appear here with their traffic
          over time.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead className="text-right">Est. traffic / mo</TableHead>
              <TableHead className="text-right">Keywords</TableHead>
              <TableHead className="text-right">As of</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.domain}>
                <TableCell>
                  {row.name ?? row.domain}
                  {row.isOwn ? (
                    <Badge variant="soft" className="ml-2">
                      You
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.latest?.organicTraffic == null
                    ? "—"
                    : formatCount(row.latest.organicTraffic)}
                  <TrafficChange
                    latest={row.latest?.organicTraffic ?? null}
                    previous={row.previous?.organicTraffic ?? null}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.latest?.organicKeywords == null
                    ? "—"
                    : formatCount(row.latest.organicKeywords)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {row.latest
                    ? formatShortDate(row.latest.capturedAt)
                    : "never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {confirming ? (
        <ConfirmDialog
          title="Refresh competitor data?"
          confirmLabel="Refresh"
          pending={refreshMutation.isPending}
          onConfirm={() => refreshMutation.mutate()}
          onClose={() => setConfirming(false)}
        >
          Fetches Domain Overview for {rows.length} domains. Results still in
          the cache are free; the rest use DataForSEO credits.
        </ConfirmDialog>
      ) : null}
    </CardShell>
  );
}
