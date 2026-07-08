import { AffiliateSlateWidget } from "@/components/b2b/AffiliateSlateWidget";
import { LiveBettingSignalWidget } from "@/components/b2b/LiveBettingSignalWidget";
import {
  DEMO_AFFILIATE_MATCHES,
  DEMO_LIVE_GAMES,
} from "@/lib/b2b-widgets";
import {
  getPartnersKpis,
  PARTNERS_NARRATIVE,
} from "@/lib/partners-deck";
import { AFFILIATION_DISCLAIMER, GAMBLING_DISCLAIMER } from "@/lib/site";
import { Check } from "lucide-react";

export function PartnersExecutiveDeck() {
  const kpis = getPartnersKpis();
  const featuredMatch = DEMO_AFFILIATE_MATCHES[0];
  const featuredLive = DEMO_LIVE_GAMES[0];

  return (
    <div className="partners-deck">
      <header className="partners-hero">
        <p className="b2b-kicker">Partnership overview</p>
        <h1 className="partners-hero-title">
          Referee intelligence for enterprise sports partners
        </h1>
        <p className="partners-hero-lead">{PARTNERS_NARRATIVE.solution}</p>

        <dl className="partners-kpi-grid" aria-label="Platform traction">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="partners-kpi">
              <dt className="partners-kpi-label">{kpi.label}</dt>
              <dd className="partners-kpi-value b2b-data">{kpi.value}</dd>
              {kpi.hint ? (
                <p className="partners-kpi-hint">{kpi.hint}</p>
              ) : null}
            </div>
          ))}
        </dl>
      </header>

      <section className="partners-section" aria-labelledby="partners-problem">
        <h2 id="partners-problem" className="partners-section-title">
          The gap
        </h2>
        <p className="partners-section-copy">{PARTNERS_NARRATIVE.problem}</p>
      </section>

      <section
        className="partners-section"
        aria-labelledby="partners-comparison"
      >
        <h2 id="partners-comparison" className="partners-section-title">
          Traditional search vs. Ref Watch
        </h2>
        <div className="partners-comparison">
          <div className="partners-comparison-col">
            <h3 className="partners-comparison-heading">Traditional workflow</h3>
            <ul className="partners-comparison-list">
              {PARTNERS_NARRATIVE.comparison.traditional.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="partners-comparison-col partners-comparison-col--highlight">
            <h3 className="partners-comparison-heading">Ref Watch</h3>
            <ul className="partners-comparison-list">
              {PARTNERS_NARRATIVE.comparison.refWatch.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        className="partners-section"
        aria-labelledby="partners-capabilities"
      >
        <h2 id="partners-capabilities" className="partners-section-title">
          Platform strengths
        </h2>
        <ul className="partners-capabilities">
          {PARTNERS_NARRATIVE.capabilities.map((item) => (
            <li key={item} className="partners-capability">
              <Check className="partners-capability-icon" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="partners-section" aria-labelledby="partners-product">
        <h2 id="partners-product" className="partners-section-title">
          Product proof
        </h2>
        <p className="partners-section-copy">
          Public slate card, crew chief context, historical tendency tags, and
          sample-gated confidence for media-safe distribution.
        </p>
        <div className="partners-product-showcase">
          <AffiliateSlateWidget match={featuredMatch} demoMode />
        </div>
      </section>

      <section
        className="partners-section partners-section--opportunity"
        aria-labelledby="partners-opportunity"
      >
        <h2 id="partners-opportunity" className="partners-section-title">
          Partnership opportunity
        </h2>
        <ul className="partners-opportunity-grid">
          {PARTNERS_NARRATIVE.enterpriseUses.map((use) => (
            <li key={use.title} className="partners-opportunity-card">
              <h3 className="partners-opportunity-title">{use.title}</h3>
              <p className="partners-opportunity-outcome">{use.outcome}</p>
            </li>
          ))}
        </ul>
      </section>

      <details className="partners-appendix">
        <summary className="partners-appendix-trigger">
          Technical appendix, widget specs &amp; additional demos
        </summary>
        <div className="partners-appendix-body">
          <p className="partners-section-copy">
            The modules below are private integration demos for licensed partners.
            They include transactional CTAs and betting-adjacent copy not shown on
            the public RefWatch site.
          </p>
          <section className="partners-appendix-block">
            <h3 className="partners-appendix-heading">Live in-game signal module (partner demo)</h3>
            <p className="partners-section-copy">
              Whistle-pattern speedometer with leverage-aware copy for in-game
              partner dashboards.
            </p>
            <LiveBettingSignalWidget game={featuredLive} />
          </section>

          <section className="partners-appendix-block">
            <h3 className="partners-appendix-heading">Affiliate slate scenarios (partner demo)</h3>
            <div className="b2b-demo-grid">
              {DEMO_AFFILIATE_MATCHES.slice(1).map((match) => (
                <AffiliateSlateWidget key={match.id} match={match} partnerDemo />
              ))}
            </div>
          </section>

          <section className="partners-appendix-block">
            <h3 className="partners-appendix-heading">Live tracker variants</h3>
            <div className="b2b-demo-grid b2b-demo-grid--live">
              {DEMO_LIVE_GAMES.slice(1).map((game) => (
                <LiveBettingSignalWidget key={game.id} game={game} />
              ))}
            </div>
          </section>

          <p className="partners-disclaimer">
            {AFFILIATION_DISCLAIMER} {GAMBLING_DISCLAIMER} Demo widgets use mock
            odds and confidence scores, not connected to a live sportsbook feed.
          </p>
        </div>
      </details>
    </div>
  );
}
