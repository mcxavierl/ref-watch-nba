import {
  LIVE_NCAA_CONFERENCES,
  type LiveNcaaConferenceId,
} from "@/lib/ncaa-conference-gate";

export type CbbTrendsConferenceScope = "all" | LiveNcaaConferenceId;

const CONFERENCE_SLUGS: Record<CbbTrendsConferenceScope, string> = {
  all: "all",
  ACC: "acc",
  "Big Ten": "big-ten",
  "Big 12": "big-12",
  SEC: "sec",
  "Big East": "big-east",
};

const SLUG_TO_CONFERENCE = Object.fromEntries(
  Object.entries(CONFERENCE_SLUGS).map(([conference, slug]) => [
    slug,
    conference as CbbTrendsConferenceScope,
  ]),
) as Record<string, CbbTrendsConferenceScope>;

export const CBB_TRENDS_CONFERENCE_OPTIONS: readonly CbbTrendsConferenceScope[] = [
  "all",
  ...LIVE_NCAA_CONFERENCES,
];

export function cbbTrendsConferenceSlug(
  conference: CbbTrendsConferenceScope,
): string {
  return CONFERENCE_SLUGS[conference];
}

export function readCbbTrendsConferenceParam(
  value: string | null | undefined,
): CbbTrendsConferenceScope {
  if (!value) return "all";
  const normalized = value.trim().toLowerCase();
  return SLUG_TO_CONFERENCE[normalized] ?? "all";
}

export function cbbTrendsConferenceLabel(
  conference: CbbTrendsConferenceScope,
): string {
  if (conference === "all") return "All conferences";
  return conference;
}
