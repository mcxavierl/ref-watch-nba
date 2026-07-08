import type { Metadata } from "next";
import { AffiliateSlateWidget } from "@/components/b2b/AffiliateSlateWidget";
import { LiveBettingSignalWidget } from "@/components/b2b/LiveBettingSignalWidget";
import {
  DEMO_AFFILIATE_MATCHES,
  DEMO_LIVE_GAMES,
} from "@/lib/b2b-widgets";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "B2B partnership widgets (demo)",
  description:
    "Ref Watch affiliate slate and live-betting signal widget concepts for sportsbook and data partners.",
  robots: { index: false, follow: false },
  alternates: { canonical: absoluteUrl("/partners") },
};

export default function PartnersDemoPage() {
  return (
    <div className="page-shell">
      <header className="b2b-demo-hero">
        <p className="b2b-kicker">B2B partnership concepts</p>
        <h1 className="page-title">Transactional & live signal widgets</h1>
        <p className="page-lead">
          Demo visualizations for affiliate slate cards and live-betting predictive
          overlays. Mock odds and confidence scores — not connected to a live
          sportsbook feed.
        </p>
      </header>

      <section className="section-block">
        <h2 className="section-title">Dynamic transactional affiliate widget</h2>
        <p className="section-lead">
          Slate match cards surface the crew chief&apos;s strongest historical
          outlier, compare it to a partner prop line, and expose a gold-accent
          call-to-action when Ref Watch signal aligns.
        </p>
        <div className="b2b-demo-grid">
          {DEMO_AFFILIATE_MATCHES.map((match) => (
            <AffiliateSlateWidget key={match.id} match={match} />
          ))}
        </div>
      </section>

      <section className="section-block">
        <h2 className="section-title">Live-betting predictive signal widget</h2>
        <p className="section-lead">
          In-game dashboard module with a whistle-pattern speedometer (red =
          heavy, amber = baseline, green = swallow) and leverage-aware copy
          keyed to crew composition and game state.
        </p>
        <div className="b2b-demo-grid b2b-demo-grid--live">
          {DEMO_LIVE_GAMES.map((game) => (
            <LiveBettingSignalWidget key={game.id} game={game} />
          ))}
        </div>
      </section>

      <p className="b2b-demo-disclaimer">
        Demo only. Not betting advice. Partner branding shown for illustration;
        no live odds integration. Past referee patterns do not predict future
        results.
      </p>
    </div>
  );
}
