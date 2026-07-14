import Link from "next/link";
import { formatSigned } from "@/lib/stats-utils";
import {
  buildWhistleDispositionResearchCards,
  LWIS_MIN_HIGH_LEVERAGE_EVENTS,
  LWIS_TRAILING_GAME_WINDOW,
  type WhistleDispositionResearchCard,
} from "@/lib/whistle-disposition";
import type { LeagueId } from "@/lib/leagues";
import type { RefStatsFile } from "@/lib/types";
import { isWhistleTaxonomyLeague } from "@/config/penalty-types";

function DispositionMetricPair({
  card,
}: {
  card: WhistleDispositionResearchCard;
}) {
  return (
    <div className="whistle-disposition-dual whistle-disposition-dual--profile">
      <div className="whistle-disposition-metric whistle-disposition-metric--admin">
        <span className="whistle-disposition-metric-label">
          Administrative rate (freq)
        </span>
        <span className="whistle-disposition-metric-value">
          {card.administrativePerGame.toFixed(1)}
        </span>
        <span className="whistle-disposition-metric-delta">
          {formatSigned(card.administrativeDelta)} vs league avg
        </span>
      </div>
      <div className="whistle-disposition-divider" aria-hidden="true" />
      <div className="whistle-disposition-metric whistle-disposition-metric--lwis">
        <span className="whistle-disposition-metric-label">
          Impact score (leverage-weighted)
        </span>
        <span className="whistle-disposition-metric-value">
          {card.lwisPerGame.toFixed(3)}
        </span>
        <span className="whistle-disposition-metric-delta">
          {formatSigned(card.lwisDelta)} vs league LWIS mean
        </span>
      </div>
    </div>
  );
}

export function WhistleDispositionResearchSection({
  stats,
  leagueId,
  scopedSeasons,
  basePath = "",
}: {
  stats: RefStatsFile;
  leagueId: LeagueId;
  scopedSeasons: string[];
  basePath?: string;
}) {
  if (!isWhistleTaxonomyLeague(leagueId)) return null;

  const cards = buildWhistleDispositionResearchCards(
    stats,
    leagueId,
    scopedSeasons,
    4,
  );
  if (cards.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">Whistle transparency</h2>
      <p className="section-lead">
        Administrative rate (frequency-based) vs leverage-weighted impact score
        (LWIS). Officials appear only after meeting the{" "}
        {LWIS_MIN_HIGH_LEVERAGE_EVENTS}-event high-leverage gate within the
        trailing {LWIS_TRAILING_GAME_WINDOW}-game sample.
      </p>
      <ul className="rankings-insight-grid">
        {cards.map((card) => (
          <li
            key={card.refSlug}
            className="rankings-insight-card whistle-disposition-card"
          >
            <p className="rankings-insight-kicker">High-impact disposition</p>
            <Link
              href={`${basePath}/refs/${card.refSlug}`}
              className="rankings-insight-name"
            >
              {card.refName}
            </Link>
            <DispositionMetricPair card={card} />
            <p className="mt-2 text-xs text-muted">
              {card.highLeverageEventCount} high-leverage subjective events ·{" "}
              {card.eventBackedGames > 0
                ? `${card.eventBackedGames} PBP-backed games`
                : "taxonomy-estimated split"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
