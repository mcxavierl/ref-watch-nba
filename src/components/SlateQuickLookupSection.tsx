import { SlateQuickLookup } from "@/components/SlateQuickLookup";
import { getRefStats } from "@/lib/data";

const SAMPLE_REF_SLUGS = ["scott-foster-48", "tony-brothers-25", "marc-davis-8"];

export function SlateQuickLookupSection() {
  const refStats = getRefStats();
  const refs = refStats.refs.map((ref) => ({
    slug: ref.slug,
    name: ref.name,
    games: ref.games,
  }));

  return <SlateQuickLookup refs={refs} sampleRefSlugs={SAMPLE_REF_SLUGS} />;
}
