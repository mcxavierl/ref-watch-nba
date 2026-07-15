import type { FindingCategory } from "@/lib/findings-shared";
import {
  computeResearchFindingsForLeague,
  type ResearchFinding,
} from "@/lib/research";

/** Category acts as the research tag for cross-linking related articles. */
export function relatedInsightsForLeague(
  league: ResearchFinding["league"],
  limit = 3,
): ResearchFinding[] {
  const findings = computeResearchFindingsForLeague(league, undefined, {
    hub: true,
  });

  const seenTags = new Set<FindingCategory>();
  const picked: ResearchFinding[] = [];

  for (const finding of findings) {
    if (seenTags.has(finding.category) && picked.length >= 1) continue;
    seenTags.add(finding.category);
    picked.push(finding);
    if (picked.length >= limit) break;
  }

  if (picked.length < limit) {
    for (const finding of findings) {
      if (picked.some((item) => item.id === finding.id)) continue;
      picked.push(finding);
      if (picked.length >= limit) break;
    }
  }

  return picked;
}
