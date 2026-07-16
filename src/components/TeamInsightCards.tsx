import Link from "next/link";
import { ClinicalCard } from "@/components/hub/ClinicalCard";
import {
  REF_CARD_BODY_CLASS,
  REF_CARD_KICKER_CLASS,
} from "@/components/hub/RefCard";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { RefAvatar } from "@/components/RefAvatar";
import { PreliminaryDataBadge } from "@/components/shared/PreliminaryDataBadge";
import { isPreliminarySample } from "@/lib/data-maturity";
import type { TeamInsight } from "@/lib/team-insights";

/**
 * CLINICAL MODERN STANDARD: Must use tabular-nums, icon-paired status badges,
 * and sample-gate provenance metadata.
 */
export function TeamInsightCards({
  insights,
  basePath = "",
  sport = "nba",
}: {
  insights: TeamInsight[];
  basePath?: string;
  sport?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
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
            className="team-insight-card data-card px-4 py-4"
            data-insight={insight.category}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className={REF_CARD_KICKER_CLASS}>{insight.title}</p>
              <StatusBadge verdict="caution" label="Pattern" compact />
              {isPreliminarySample(insight.sampleGames) ? (
                <PreliminaryDataBadge compact />
              ) : null}
            </div>
            <p className={`mt-3 ${REF_CARD_BODY_CLASS}`}>{insight.body}</p>
            <p className="mt-2 text-xs text-primary-muted tabular-nums">
              {insight.sampleGames} games in sample
            </p>
            {insight.refSlug && insight.refName && (
              <Link
                href={`${basePath}/refs/${insight.refSlug}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-900 hover:text-raptors hover:underline"
              >
                <RefAvatar
                  name={insight.refName}
                  slug={insight.refSlug}
                  sport={sport}
                  size="sm"
                />
                {insight.refName} profile →
              </Link>
            )}
          </ClinicalCard>
        ))}
      </ul>
    </section>
  );
}
