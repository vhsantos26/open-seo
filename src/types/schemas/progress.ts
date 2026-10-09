import { z } from "zod";
import { GSC_DATE_RANGES } from "@/server/features/gsc/searchAnalytics";

const projectIdField = z.string().uuid();

export const progressReportInputSchema = z.object({
  projectId: projectIdField,
  dateRange: z.enum(GSC_DATE_RANGES).default("last_28_days"),
});

export const progressProjectInputSchema = z.object({
  projectId: projectIdField,
});

export const addAnnotationSchema = z.object({
  projectId: projectIdField,
  // The day the change happened, YYYY-MM-DD.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().min(1).max(500),
  url: z
    .url({ protocol: /^https?$/ })
    .max(2000)
    .nullable(),
});

export const removeAnnotationSchema = z.object({
  projectId: projectIdField,
  annotationId: z.string().uuid(),
});

export const inspectPagesSchema = z.object({
  projectId: projectIdField,
  urls: z
    .array(z.url({ protocol: /^https?$/ }).max(2000))
    .min(1)
    .max(20),
});

export const trackCompetitorSchema = z.object({
  projectId: projectIdField,
  domain: z.string().trim().min(1).max(2048),
  locationCode: z.number().int().positive().optional(),
});
