import Link from "next/link";
import { TermHelp } from "@/components/TermHelp";
import {
  METHODOLOGY_PAGE_LEAD,
  METHODOLOGY_QUICK_LINKS,
  METHODOLOGY_SECTIONS,
} from "@/lib/methodology-content";
import type { CrossLeagueOverview } from "@/lib/cross-league-overview";
import "@/components/methodology-page.css";

type MethodologyPageContentProps = {
  snapshot: Pick<
    CrossLeagueOverview,
    "totalRefs" | "totalGames" | "liveLeagueCount" | "whistleEventsLogged" | "whistleLabel"
  >;
};

function formatCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1000)}K`;
  }
  return value.toLocaleString("en-US");
}

export function MethodologyPageContent({ snapshot }: MethodologyPageContentProps) {
  return (
    <>
      <section className="page-hero">
        <h1 className="page-title">Methodology</h1>
        <p className="page-lead">{METHODOLOGY_PAGE_LEAD}</p>

        <div className="methodology-stats-row" aria-label="Dataset scale">
          <div className="methodology-stat-pill">
            <span className="methodology-stat-value">{formatCount(snapshot.totalRefs)}</span>
            <span className="methodology-stat-label">Officials</span>
          </div>
          <div className="methodology-stat-pill">
            <span className="methodology-stat-value">{formatCount(snapshot.totalGames)}</span>
            <span className="methodology-stat-label">Games logged</span>
          </div>
          <div className="methodology-stat-pill">
            <span className="methodology-stat-value">{snapshot.liveLeagueCount}</span>
            <span className="methodology-stat-label">Live leagues</span>
          </div>
          <div className="methodology-stat-pill">
            <span className="methodology-stat-value">
              {formatCount(snapshot.whistleEventsLogged)}
            </span>
            <span className="methodology-stat-label">{snapshot.whistleLabel}</span>
          </div>
        </div>
      </section>

      <div className="methodology-grid">
        {METHODOLOGY_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className={`methodology-capsule${
              section.id === "principles" || section.id === "limits"
                ? " methodology-capsule--wide"
                : ""
            }`}
            aria-labelledby={`methodology-${section.id}-heading`}
          >
            <h2 className="methodology-capsule-title" id={`methodology-${section.id}-heading`}>
              {section.title}
            </h2>
            {section.lead ? (
              <p className="methodology-capsule-lead">{section.lead}</p>
            ) : null}
            <ul className="methodology-capsule-list">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        ))}

        <section
          className="methodology-capsule methodology-capsule--wide"
          aria-labelledby="methodology-glossary-heading"
        >
          <h2 className="methodology-capsule-title" id="methodology-glossary-heading">
            Glossary
          </h2>
          <p className="methodology-capsule-lead">
            Tap any highlighted term across the site for an inline definition.
          </p>
          <ul className="methodology-capsule-list">
            <li>
              <TermHelp id="sample-gate" />: minimum games before a stat is shown in rankings or
              alerts.
            </li>
            <li>
              <TermHelp id="foul-edge" />: crew-level whistle volume for a team in games with a
              specific official.
            </li>
            <li>
              <TermHelp id="whistle-premium" />: combined scoring pace above or below league
              average for a crew.
            </li>
            <li>
              <TermHelp id="closing-line" />: sportsbook total or spread near tipoff, when
              available in the ingest.
            </li>
            <li>
              <TermHelp id="gsni" />: clutch whistle tendency vs league in matched game states (multi-league where game logs support GSNI).
            </li>
            <li>
              <TermHelp id="game-state-index" />: inline label for GSNI on profiles and research hubs.
            </li>
            <li>
              LWIS (Leverage-Weighted Impact Score): subjective whistle leverage from win-probability proxies; withheld until the high-leverage event gate clears.
            </li>
            <li>
              <TermHelp id="provenance-estimated" />: partial or proxy data flagged on the card.
            </li>
          </ul>
        </section>
      </div>

      <nav className="methodology-quick-links" aria-label="Related tools">
        {METHODOLOGY_QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="methodology-quick-link">
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
