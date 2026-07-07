import { computeAllFindings as computeNbaFindings } from "@/lib/findings";
import { computeAllFindings as computeNhlFindings } from "@/lib/nhl/findings";
import type { Finding } from "@/lib/findings-shared";

export interface ResearchFinding extends Finding {
  league: "NBA" | "NHL";
}

export function computeAllResearchFindings(): ResearchFinding[] {
  const nba = computeNbaFindings().map(
    (f): ResearchFinding => ({ ...f, league: "NBA" }),
  );
  const nhl = computeNhlFindings().map(
    (f): ResearchFinding => ({ ...f, league: "NHL" }),
  );
  return [...nba, ...nhl];
}

export function getResearchFindingById(
  id: string,
): ResearchFinding | undefined {
  return computeAllResearchFindings().find((f) => f.id === id);
}

export function getAllResearchFindingIds(): string[] {
  return computeAllResearchFindings().map((f) => f.id);
}
