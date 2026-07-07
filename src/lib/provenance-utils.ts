import type { MetricProvenance, ProvenanceTag } from "@/lib/types";

export function provenanceLabel(tag: ProvenanceTag): string {
  switch (tag) {
    case "computed-from-real":
      return "From real games";
    case "computed-with-partial-data":
      return "Partial / simulated data";
    case "fallback-constant":
      return "Estimated constant";
  }
}

export function isEstimatedTag(tag: ProvenanceTag): boolean {
  return tag !== "computed-from-real";
}

export function provenanceValueClass(
  provenance?: MetricProvenance,
): string | undefined {
  if (!provenance || !isEstimatedTag(provenance.tag)) return undefined;
  return "text-zinc-500";
}
