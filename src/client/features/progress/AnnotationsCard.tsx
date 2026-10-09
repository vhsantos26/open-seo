import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  addProgressAnnotation,
  removeProgressAnnotation,
  type getProgressReport,
} from "@/serverFunctions/progress";
import { formatShortDate, pageLabel, todayInputValue } from "./progressFormat";

type Report = Awaited<ReturnType<typeof getProgressReport>>;

const WHOLE_SITE = "";

export function AnnotationsCard({
  projectId,
  annotations,
  pageUrls,
  onChanged,
}: {
  projectId: string;
  annotations: Report["annotations"];
  pageUrls: string[];
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayInputValue);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState(WHOLE_SITE);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["progressReport"] });
    onChanged();
  };

  const addMutation = useMutation({
    mutationFn: () =>
      addProgressAnnotation({
        data: { projectId, date, note, url: url === WHOLE_SITE ? null : url },
      }),
    onSuccess: () => {
      setNote("");
      refresh();
    },
  });
  const removeMutation = useMutation({
    mutationFn: (annotationId: string) =>
      removeProgressAnnotation({ data: { projectId, annotationId } }),
    onSuccess: refresh,
  });

  return (
    <CardShell title="Changes">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (note.trim() && !addMutation.isPending) addMutation.mutate();
        }}
      >
        <label className="space-y-1 text-xs text-muted-foreground">
          Date
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            className="w-40"
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Page
          <select
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-10 w-56 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value={WHOLE_SITE}>Whole site</option>
            {pageUrls.map((pageUrl) => (
              <option key={pageUrl} value={pageUrl}>
                {pageLabel(pageUrl)}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-56 flex-1 space-y-1 text-xs text-muted-foreground">
          What changed
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="Rewrote the intro and added an FAQ"
          />
        </label>
        <Button type="submit" disabled={!note.trim() || addMutation.isPending}>
          Add
        </Button>
      </form>

      {annotations.length === 0 ? (
        <p className="pt-4 text-sm text-muted-foreground">
          Note each edit here so you can compare it with the rankings and
          traffic that follow.
        </p>
      ) : (
        <ul className="divide-y divide-border pt-2">
          {annotations.map((annotation) => (
            <li
              key={annotation.id}
              className="flex items-start gap-3 py-2 text-sm"
            >
              <span className="w-14 shrink-0 text-muted-foreground tabular-nums">
                {formatShortDate(annotation.date)}
              </span>
              <span className="min-w-0 flex-1">
                {annotation.note}
                <span className="block truncate text-xs text-muted-foreground">
                  {annotation.url ? pageLabel(annotation.url) : "Whole site"}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete note"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(annotation.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}
