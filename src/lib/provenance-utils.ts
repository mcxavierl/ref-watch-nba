import type { MetricProvenance, ProvenanceTag } from "@/lib/types";

export function provenanceLabel(tag: ProvenanceTag): string {
  switch (tag) {
    case "computed-from-real":
      return "From real games";
    case "computed-with-partial-data":
      return "Partial data";
    case "fallback-constant":
      return "Estimated constant";
  }
}

/** Fallback constants and genuinely incomplete slices — not thin samples. */
export function isEstimatedTag(tag: ProvenanceTag): boolean {
  return tag === "fallback-constant" || tag === "computed-with-partial-data";
}

/** Never render fallback-constant values in the UI. */
export function isFallbackMetric(provenance?: MetricProvenance): boolean {
  return provenance?.tag === "fallback-constant";
}

export function provenanceValueClass(
  provenance?: MetricProvenance,
): string | undefined {
  if (!provenance || !isEstimatedTag(provenance.tag)) return undefined;
  return "text-zinc-500";
}
