import Link from "next/link";
import { ClinicalCard } from "@/components/hub/ClinicalCard";
import {
  REF_CARD_BODY_CLASS,
  REF_CARD_CLASS,
  REF_CARD_KICKER_CLASS,
} from "@/components/hub/RefCard";
import { RefAvatar } from "@/components/RefAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import type { TeamInsight } from "@/lib/team-insights";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, dual-avatar headers when a ref
 * is linked, and sample-gate provenance metadata.
 */
export function TeamInsightCards({
  insights,
  basePath = "",
  sport = "nba",
  teamAbbr,
  teamLabel,
}: {
  insights: TeamInsight[];
  basePath?: string;
  sport?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  teamAbbr: string;
  teamLabel: string;
}) {
  if (insights.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">Notable patterns</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <ClinicalCard
            as="li"
            key={insight.id}
            className={`team-insight-card ${REF_CARD_CLASS} border-slate-800 px-4 py-4`}
            data-insight={insight.category}
          >
            <p className={REF_CARD_KICKER_CLASS}>{insight.title}</p>

            {insight.refSlug && insight.refName ? (
              <div className="clinical-insight-matrix-avatars mt-3" aria-hidden>
                <RefAvatar
                  name={insight.refName}
                  slug={insight.refSlug}
                  sport={sport}
                  size="lg"
                  decorative
                />
                <span className="clinical-insight-matrix-vs">vs</span>
                <TeamLogo
                  team={{ abbr: teamAbbr, name: teamLabel }}
                  sport={sport}
                  size="xl"
                  className="clinical-insight-matrix-team-logo"
                />
              </div>
            ) : null}

            <p className={`mt-3 ${REF_CARD_BODY_CLASS}`}>{insight.body}</p>
            <p className="mt-2 text-sm text-slate-500 tabular-nums">
              {insight.sampleGames} games in sample
            </p>
            {insight.refSlug && insight.refName && (
              <Link
                href={`${basePath}/refs/${insight.refSlug}`}
                className="clinical-insight-matrix-ref-name rankings-insight-name mt-3 inline-block transition hover:text-raptors"
              >
                {insight.refName} profile →
              </Link>
            )}
          </ClinicalCard>
        ))}
      </ul>
    </section>
  );
}
