import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CardShell } from "@/client/components/CardShell";
import { Input } from "@/client/components/ui/input";
import { type getProgressReport } from "@/serverFunctions/progress";
import { setTrackingKeywordsTargetUrl } from "@/serverFunctions/rank-tracking";

type Report = Awaited<ReturnType<typeof getProgressReport>>;
type Keyword = Report["unmapped"][number];

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function KeywordRow({
  projectId,
  keyword,
  listId,
}: {
  projectId: string;
  keyword: Keyword;
  listId: string;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const mutation = useMutation({
    mutationFn: (targetUrl: string) =>
      setTrackingKeywordsTargetUrl({
        data: {
          projectId,
          configId: keyword.configId,
          keywordIds: [keyword.trackingKeywordId],
          targetUrl,
        },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["progressReport"] }),
  });
  const save = () => {
    const target = value.trim();
    if (isHttpUrl(target) && !mutation.isPending) mutation.mutate(target);
  };
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="w-56 shrink-0 truncate">{keyword.keyword}</span>
      <Input
        list={listId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
        }}
        placeholder="https://… (the page that should rank)"
        className="h-8 flex-1"
      />
    </li>
  );
}

export function UnmappedKeywordsCard({
  projectId,
  keywords,
  pageUrls,
}: {
  projectId: string;
  keywords: Keyword[];
  pageUrls: string[];
}) {
  const listId = useId();
  if (keywords.length === 0) return null;
  return (
    <CardShell title="Keywords without a target page">
      <p className="pb-2 text-sm text-muted-foreground">
        Point each tracked keyword at the page that should rank for it. It then
        shows up under that page above.
      </p>
      <datalist id={listId}>
        {pageUrls.map((url) => (
          <option key={url} value={url} />
        ))}
      </datalist>
      <ul className="divide-y divide-border">
        {keywords.map((keyword) => (
          <KeywordRow
            key={keyword.trackingKeywordId}
            projectId={projectId}
            keyword={keyword}
            listId={listId}
          />
        ))}
      </ul>
    </CardShell>
  );
}
