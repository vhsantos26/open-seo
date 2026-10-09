import { createServerFn } from "@tanstack/react-start";
import { ProgressService } from "@/server/features/progress/services/ProgressService";
import { GscNotConnectedError } from "@/server/features/gsc/services/GscService";
import { AppError } from "@/server/lib/errors";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  addAnnotationSchema,
  inspectPagesSchema,
  progressProjectInputSchema,
  progressReportInputSchema,
  removeAnnotationSchema,
} from "@/types/schemas/progress";

export const getProgressReport = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(progressReportInputSchema)
  .handler(({ data, context }) =>
    ProgressService.getReport({
      projectId: context.projectId,
      projectDomain: context.project.domain,
      dateRange: data.dateRange,
    }),
  );

export const addProgressAnnotation = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(addAnnotationSchema)
  .handler(({ data, context }) =>
    ProgressService.addAnnotation({
      projectId: context.projectId,
      date: data.date,
      note: data.note,
      url: data.url,
    }),
  );

export const removeProgressAnnotation = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(removeAnnotationSchema)
  .handler(({ data, context }) =>
    ProgressService.removeAnnotation(context.projectId, data.annotationId),
  );

export const getProgressBenchmark = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(progressProjectInputSchema)
  .handler(({ context }) =>
    ProgressService.getBenchmark({
      projectId: context.projectId,
      projectDomain: context.project.domain,
    }),
  );

// Metered: each domain whose Domain Overview is not already cached is one
// DataForSEO call.
export const refreshProgressBenchmark = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(progressProjectInputSchema)
  .handler(({ context }) =>
    ProgressService.refreshBenchmark(
      {
        projectId: context.projectId,
        projectDomain: context.project.domain,
        project: context.project,
      },
      context,
    ),
  );

// Free (Search Console URL Inspection), but needs a connected property.
export const inspectProgressPages = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(inspectPagesSchema)
  .handler(async ({ data, context }) => {
    try {
      return await ProgressService.inspectPages(context.projectId, data.urls);
    } catch (error) {
      if (error instanceof GscNotConnectedError) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Connect Google Search Console to check indexing.",
        );
      }
      throw error;
    }
  });
