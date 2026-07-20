import { FooterLeaders } from "@/components/hub/FooterLeaders";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";

export type AnalyticsLeaderMetric = {
  primaryTotal: string;
  variancePct: number;
  comparisonCaption?: string;
};

export type AnalyticsLeaderItem = {
  category: string;
  title: string;
  detail: string;
  ref: RefProfile;
  value: string;
  delta?: number;
  metric?: AnalyticsLeaderMetric;
};

export function AnalyticsLeadersSection({
  leaders,
  leagueId,
  hrefPrefix,
  sport,
  title,
  lead,
}: {
  leaders: AnalyticsLeaderItem[];
  leagueId: LeagueId;
  hrefPrefix: string;
  sport: "nfl" | "epl" | "laliga" | "cfb" | "cbb";
  title: string;
  lead: string;
}) {
  return (
    <FooterLeaders
      leaders={leaders}
      leagueId={leagueId}
      hrefPrefix={hrefPrefix}
      sport={sport}
      title={title}
      lead={lead}
    />
  );
}
