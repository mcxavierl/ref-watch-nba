import type { DataConfidenceSummary } from "@/lib/provenance";

export function DataConfidenceSummary({
  summary,
  label = "Data confidence on this page",
}: {
  summary: DataConfidenceSummary;
  label?: string;
}) {
  if (summary.total === 0) return null;

  return (
    <p className="rounded-lg border border-border bg-zinc-50/80 px-3 py-2 text-sm text-zinc-700">
      <span className="font-medium text-zinc-800">{label}:</span>{" "}
      {summary.real} from real game logs · {summary.partial} partial ·{" "}
      {summary.estimated} estimated constants
      <span className="text-zinc-500">
        {" "}
        ({summary.total} tracked metrics)
      </span>
    </p>
  );
}
