import { Line, LineChart } from "recharts";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";
import type { DashboardBacklinkSummary } from "@/server/features/dashboard/services/DashboardService";

const config = {
  referringDomains: { label: "All referring domains", color: "#6b7280" },
  qualityReferringDomains: { label: "Quality domains", color: "#16a34a" },
} satisfies ChartConfig;

function formatDay(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Referring domains per snapshot: the raw total next to the count that passes
 * the spam filter. The gap between the lines is the junk. The quality line only
 * starts at the first snapshot that recorded it.
 */
export function BacklinkGrowthChart({
  history,
}: {
  history: DashboardBacklinkSummary["history"];
}) {
  const points = history.flatMap((point) => {
    const checkedAt = Date.parse(
      /^\d{4}-\d{2}-\d{2} /.test(point.capturedAt)
        ? `${point.capturedAt.replace(" ", "T")}Z`
        : point.capturedAt,
    );
    return Number.isNaN(checkedAt)
      ? []
      : [
          {
            checkedAt,
            referringDomains: point.referringDomains,
            qualityReferringDomains: point.qualityReferringDomains,
          },
        ];
  });
  if (points.length < 2) return null;

  return (
    <div className="space-y-1 pt-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Referring domains over time
      </p>
      <ChartContainer config={config} className="h-40">
        <LineChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <ChartGrid />
          <ChartXAxis
            dataKey="checkedAt"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatDay}
          />
          <ChartYAxis allowDecimals={false} width={40} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) =>
                  typeof label === "number" ? formatDay(label) : ""
                }
              />
            }
          />
          {(["referringDomains", "qualityReferringDomains"] as const).map(
            (key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ),
          )}
        </LineChart>
      </ChartContainer>
      <div className="flex gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#6b7280]" />
          All referring domains
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#16a34a]" />
          Quality (spam score ≤ 40)
        </span>
      </div>
    </div>
  );
}
