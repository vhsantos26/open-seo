import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { projectContextQueryKey } from "@/client/features/projects/project-context/shared";
import { getProjectContext } from "@/serverFunctions/projectContext";
import { trackCompetitor } from "@/serverFunctions/progress";

function bareHost(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

/**
 * Saves the domain on screen as a competitor and stores its first traffic
 * snapshot, so it shows up (with history) under Progress without a second trip
 * to Context.
 */
export function TrackCompetitorButton({
  projectId,
  domain,
  locationCode,
}: {
  projectId: string;
  domain: string;
  locationCode: number | undefined;
}) {
  const queryClient = useQueryClient();
  const contextQuery = useQuery({
    queryKey: projectContextQueryKey(projectId),
    queryFn: () => getProjectContext({ data: { projectId } }),
  });
  const mutation = useMutation({
    mutationFn: () =>
      trackCompetitor({ data: { projectId, domain, locationCode } }),
    onSuccess: (result) => {
      toast.success(
        result.snapshotSaved
          ? `${result.domain} added to competitors`
          : `${result.domain} added to competitors (no traffic data yet)`,
      );
      void queryClient.invalidateQueries({
        queryKey: projectContextQueryKey(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["progressBenchmark", projectId],
      });
    },
  });

  const host = bareHost(domain);
  const tracked =
    mutation.isSuccess ||
    (contextQuery.data?.competitors.some(
      (competitor) => bareHost(competitor.domain) === host,
    ) ??
      false);

  if (tracked) {
    return (
      <Badge variant="success" className="gap-1">
        <Check className="size-3" />
        Competitor
      </Badge>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={contextQuery.isPending || mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <Plus data-icon="inline-start" />
      Track as competitor
    </Button>
  );
}
