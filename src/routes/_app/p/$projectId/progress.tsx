import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/client/components/PageHeader";
import { ProgressPage } from "@/client/features/progress/ProgressPage";

export const Route = createFileRoute("/_app/p/$projectId/progress")({
  component: ProgressRoute,
});

function ProgressRoute() {
  const { projectId } = Route.useParams();
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Progress"
          description="Is the site moving? Pages, rankings, changes and competitors in one place."
        />
        <ProgressPage projectId={projectId} />
      </div>
    </div>
  );
}
