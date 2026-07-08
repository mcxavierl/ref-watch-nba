import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import type { AffiliateSlateMatch } from "@/lib/b2b-widgets";
import { RefAvatar } from "@/components/RefAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import { getTeam as getNbaTeam } from "@/lib/teams";
import { getTeam as getNhlTeam } from "@/lib/nhl/teams";

export function AffiliateSlateWidget({
  match,
  demoMode = false,
  partnerDemo = false,
}: {
  match: AffiliateSlateMatch;
  /** Media-safe public demo — hides sportsbook CTAs and partner odds. */
  demoMode?: boolean;
  /** Licensed partner appendix — shows transactional CTA copy. */
  partnerDemo?: boolean;
}) {
  const away = match.sport === "nhl" ? getNhlTeam(match.awayTeam) : getNbaTeam(match.awayTeam);
  const home = match.sport === "nhl" ? getNhlTeam(match.homeTeam) : getNbaTeam(match.homeTeam);
  const basePath = match.sport === "nhl" ? "/nhl" : "";
  const directionLabel = match.offer.direction === "over" ? "Over" : "Under";
  const showPartnerOdds = partnerDemo && !demoMode;

  return (
    <article className="b2b-affiliate-card">
      <header className="b2b-affiliate-header">
        <div className="b2b-affiliate-matchup">
          {away ? (
            <span className="b2b-affiliate-team">
              <TeamLogo team={away} size="sm" sport={match.sport} />
              <span className="b2b-data">{away.abbr}</span>
            </span>
          ) : (
            <span className="b2b-data">{match.awayTeam}</span>
          )}
          <span className="b2b-affiliate-at" aria-hidden>
            @
          </span>
          {home ? (
            <span className="b2b-affiliate-team">
              <TeamLogo team={home} size="sm" sport={match.sport} />
              <span className="b2b-data">{home.abbr}</span>
            </span>
          ) : (
            <span className="b2b-data">{match.homeTeam}</span>
          )}
        </div>
        <p className="b2b-affiliate-game-total">
          Game total{" "}
          <span className="b2b-data b2b-gold">{match.gameTotal.toFixed(1)}</span>
        </p>
      </header>

      <section className="b2b-affiliate-chief">
        <p className="b2b-kicker">{match.crewChief.role}</p>
        <div className="b2b-affiliate-chief-row">
          <Link
            href={`${basePath}/refs/${match.crewChief.slug}`}
            className="b2b-affiliate-chief-link"
          >
            <RefAvatar
              name={match.crewChief.name}
              slug={match.crewChief.slug}
              sport={match.sport}
              size="sm"
            />
            <span className="b2b-heading">{match.crewChief.name}</span>
          </Link>
          {match.signalActive ? (
            <span className="b2b-signal-pill b2b-signal-pill--active">
              <Radio className="size-3" aria-hidden />
              Ref Watch Signal Active
            </span>
          ) : null}
        </div>
        <p className="b2b-affiliate-outlier">
          <span className="b2b-kicker">{match.outlier.category}</span>
          <span className="b2b-affiliate-outlier-body">
            Averages{" "}
            <span className="b2b-data b2b-gold">{match.outlier.deltaLabel}</span>{" "}
            association vs. league baseline {match.outlier.context}.
          </span>
        </p>
      </section>

      {demoMode ? (
        <section className="b2b-affiliate-odds" aria-label="Historical tendency summary">
          <p className="b2b-kicker">Historical tendency</p>
          <p className="b2b-affiliate-signal-copy">{match.signalSummary}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Sample-gated crew context for media distribution. Not betting advice.
          </p>
        </section>
      ) : (
        <section className="b2b-affiliate-odds" aria-label="Sportsbook partner offer">
          <div className="b2b-affiliate-partner">
            <span
              className="b2b-partner-mark"
              style={{ backgroundColor: match.partner.accent }}
              aria-hidden
            />
            <span className="b2b-heading">{match.partner.name}</span>
            <span className="b2b-affiliate-partner-meta">{match.offer.market}</span>
          </div>

          <div className="b2b-affiliate-line-grid">
            <div className="b2b-affiliate-line-cell">
              <p className="b2b-kicker">Live prop line</p>
              <p className="b2b-data b2b-affiliate-line-value">
                {directionLabel} {match.offer.line.toFixed(1)}
              </p>
              <p className="b2b-affiliate-line-odds b2b-data">{match.offer.americanOdds}</p>
            </div>
            <div className="b2b-affiliate-line-cell">
              <p className="b2b-kicker">Ref signal</p>
              <p className="b2b-data b2b-gold b2b-affiliate-line-value">
                {match.outlier.deltaLabel}
              </p>
              {match.offer.impliedEdge ? (
                <p className="b2b-affiliate-edge b2b-data">{match.offer.impliedEdge}</p>
              ) : null}
            </div>
          </div>

          <p className="b2b-affiliate-signal-copy">{match.signalSummary}</p>

          {showPartnerOdds ? (
            <button
              type="button"
              className="b2b-affiliate-cta"
              aria-label={`${match.partner.name} ${directionLabel} ${match.offer.line} at ${match.offer.americanOdds}`}
            >
              <span className="b2b-affiliate-cta-main">
                <span className="b2b-heading">{match.partner.name}</span>{" "}
                {match.offer.market}: {directionLabel} {match.offer.line.toFixed(1)} (
                <span className="b2b-data">{match.offer.americanOdds}</span>)
              </span>
              <span className="b2b-affiliate-cta-actions">
                <span className="b2b-affiliate-bet-now">Partner demo CTA</span>
                {match.signalActive ? (
                  <span className="b2b-signal-pill b2b-signal-pill--compact">
                    Ref Watch Signal Active
                  </span>
                ) : null}
                <ArrowUpRight className="size-4 shrink-0" aria-hidden />
              </span>
            </button>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              Partner odds module available under licensed integration.
            </p>
          )}
        </section>
      )}
    </article>
  );
}
