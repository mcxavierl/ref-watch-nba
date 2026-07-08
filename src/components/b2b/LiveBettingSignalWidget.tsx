import type { LiveGameSnapshot } from "@/lib/b2b-widgets";
import { whistlePatternMeta } from "@/lib/b2b-widgets";
import { TeamLogo } from "@/components/TeamLogo";
import { getTeam as getNbaTeam } from "@/lib/teams";
import { getTeam as getNhlTeam } from "@/lib/nhl/teams";

function gaugePosition(pattern: LiveGameSnapshot["pattern"]): number {
  switch (pattern) {
    case "high-volume":
      return 88;
    case "swallows":
      return 12;
    default:
      return 50;
  }
}

export function LiveBettingSignalWidget({ game }: { game: LiveGameSnapshot }) {
  const meta = whistlePatternMeta(game.pattern);
  const away = game.sport === "nhl" ? getNhlTeam(game.awayTeam) : getNbaTeam(game.awayTeam);
  const home = game.sport === "nhl" ? getNhlTeam(game.homeTeam) : getNbaTeam(game.homeTeam);
  const needle = gaugePosition(game.pattern);

  return (
    <article className="b2b-live-card">
      <header className="b2b-live-header">
        <div>
          <p className="b2b-kicker">Live Game Tracker</p>
          <div className="b2b-live-matchup">
            {away ? (
              <span className="b2b-live-team">
                <TeamLogo team={away} size="sm" sport={game.sport} />
                <span className="b2b-data">{away.abbr}</span>
                <span className="b2b-data b2b-live-score">{game.scoreAway}</span>
              </span>
            ) : (
              <span className="b2b-data">{game.awayTeam}</span>
            )}
            <span className="b2b-affiliate-at" aria-hidden>
              @
            </span>
            {home ? (
              <span className="b2b-live-team">
                <TeamLogo team={home} size="sm" sport={game.sport} />
                <span className="b2b-data">{home.abbr}</span>
                <span className="b2b-data b2b-live-score">{game.scoreHome}</span>
              </span>
            ) : (
              <span className="b2b-data">{game.homeTeam}</span>
            )}
          </div>
        </div>
        <div className="b2b-live-clock">
          <p className="b2b-heading">{game.period}</p>
          <p className="b2b-data b2b-gold">{game.clock}</p>
          <p className="b2b-live-context">{game.leverageContext}</p>
        </div>
      </header>

      <section className="b2b-live-gauge-wrap" aria-label="Whistle pattern confidence">
        <div className="b2b-live-gauge-labels">
          <span className="b2b-live-gauge-label b2b-live-gauge-label--heavy">
            High-Volume Whistle
          </span>
          <span className="b2b-live-gauge-label b2b-live-gauge-label--base">
            Baseline
          </span>
          <span className="b2b-live-gauge-label b2b-live-gauge-label--swallow">
            Swallows Whistle
          </span>
        </div>

        <div
          className="b2b-live-gauge-track"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={needle}
          aria-label={`${meta.label} pattern at ${game.confidence}% confidence`}
        >
          <div className="b2b-live-gauge-gradient" aria-hidden />
          <div
            className="b2b-live-gauge-needle"
            style={{ left: `${needle}%` }}
            aria-hidden
          />
        </div>

        <div className="b2b-live-gauge-footer">
          <span className={`b2b-live-pattern b2b-live-pattern--${meta.tone}`}>
            {meta.label}
          </span>
          <span className="b2b-live-confidence">
            <span className="b2b-data b2b-gold">{game.confidence}%</span>{" "}
            confidence
          </span>
        </div>
      </section>

      <section className="b2b-live-crew">
        <p className="b2b-kicker">Working crew</p>
        <p className="b2b-live-crew-names">{game.crew.join(" · ")}</p>
      </section>

      <section className="b2b-live-signal">
        <p className="b2b-heading b2b-live-headline">{game.headline}</p>
        <p className="b2b-live-body">{game.body}</p>
      </section>
    </article>
  );
}
