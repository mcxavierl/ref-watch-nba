import { SiteNavLink as Link } from "@/components/SiteNavLink";
import {
  REF_CARD_BODY_CLASS,
  REF_CARD_METRIC_CLASS,
  REF_CARD_METRIC_DETAIL_CLASS,
  REF_CARD_METRIC_LABEL_CLASS,
  RefCard,
} from "@/components/hub/RefCard";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { Pill } from "@/components/ui/Pill";
import type { SuperBowlInsightCardModel } from "@/lib/nfl/super-bowl-insight-card";

export function SuperBowlInsightCard({ card }: { card: SuperBowlInsightCardModel }) {
  return (
    <RefCard
      data-league="nfl"
      data-insight={card.id}
      data-accent="flags"
      data-tone="neutral"
      className="super-bowl-insight-card"
    >
      <p className={`${REF_CARD_METRIC_LABEL_CLASS} super-bowl-insight-stat-title`}>
        {card.primaryStatTitle}
      </p>

      <div className="super-bowl-insight-metric-row">
        <div className={REF_CARD_METRIC_CLASS}>
          <StandoutMetricValue tone="neutral" size="lg">
            {card.bigNumber}
          </StandoutMetricValue>
        </div>
        {card.variancePill ? (
          <Pill variant="meta" static className="super-bowl-insight-variance-pill tabular-nums">
            {card.variancePill}
          </Pill>
        ) : null}
      </div>

      <div className="super-bowl-insight-context">
        <p className="rankings-insight-name">{card.officialName}</p>
        <p className={`${REF_CARD_METRIC_DETAIL_CLASS} super-bowl-insight-game-context`}>
          {card.gameContext}
        </p>
      </div>

      {card.profileHref ? (
        <Link href={card.profileHref} className="super-bowl-insight-action">
          View Profile
        </Link>
      ) : (
        <p className={`${REF_CARD_BODY_CLASS} super-bowl-insight-action super-bowl-insight-action--muted`}>
          Profile unavailable
        </p>
      )}
    </RefCard>
  );
}
