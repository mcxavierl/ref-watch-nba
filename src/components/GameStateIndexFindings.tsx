import Link from "next/link";
import { GsniGauge } from "@/components/GsniGauge";
import { RESEARCH_HIGHLIGHT } from "@/config/research-highlight";
import {
  formatGsniHomeDelta,
  GSNI_NEUTRAL_SCORE,
  loadGsniHomeFindings,
  type GsniHomeFinding,
} from "@/lib/gsni-home-findings";

function FindingCard({ finding }: { finding: GsniHomeFinding }) {
  return (
    <article className={`gsni-home-finding gsni-home-finding--${finding.band}`}>
      <div className="gsni-home-finding__top">
        <div className="gsni-home-finding__identity">
          <p className="gsni-home-finding__kicker">NFL outlier</p>
          <h3 className="gsni-home-finding__title">{finding.plainTitle}</h3>
          <p className="gsni-home-finding__summary">{finding.plainSummary}</p>
        </div>
        <div className="gsni-home-finding__gauge-wrap">
          <GsniGauge index={finding.gsni} size="sm" showCaption={false} />
        </div>
      </div>

      <div
        className="gsni-home-finding__scale"
        role="img"
        aria-label={`Game-State Index ${finding.gsni} out of 100. League average is 50.`}
      >
        <div className="gsni-home-finding__scale-track">
          <div
            className="gsni-home-finding__scale-fill"
            style={{ width: `${finding.gsni}%` }}
          />
          <div className="gsni-home-finding__scale-neutral" aria-hidden />
          <div
            className="gsni-home-finding__scale-marker"
            style={{ left: `${finding.gsni}%` }}
            aria-hidden
          />
        </div>
        <div className="gsni-home-finding__scale-labels" aria-hidden>
          <span>Heavy 0</span>
          <span>Avg {GSNI_NEUTRAL_SCORE}</span>
          <span>Quiet 100</span>
        </div>
      </div>

      <p className="gsni-home-finding__delta">{finding.vsNeutralLabel}</p>

      <dl className="gsni-home-finding__stats">
        {finding.stats.map((stat) => (
          <div key={stat.label} className="gsni-home-finding__stat">
            <dt className="gsni-home-finding__stat-label">{stat.label}</dt>
            <dd className="gsni-home-finding__stat-value">{stat.value}</dd>
            <div className="gsni-home-finding__stat-bar" aria-hidden>
              <span
                className="gsni-home-finding__stat-bar-fill"
                style={{ width: `${stat.barPct}%` }}
              />
            </div>
          </div>
        ))}
      </dl>

      <div className="gsni-home-finding__footer">
        <span className="gsni-home-finding__score-chip">
          GSNI {finding.gsni}
          <span className="gsni-home-finding__score-chip-sub">
            {formatGsniHomeDelta(finding.vsNeutralDelta)}
          </span>
        </span>
        <Link href={finding.href} className="gsni-home-finding__link rw-focus-ring">
          View ref profile
        </Link>
      </div>
    </article>
  );
}

export function GameStateIndexFindings() {
  const findings = loadGsniHomeFindings();
  if (findings.length === 0) return null;

  return (
    <section
      className="gsni-home-findings"
      aria-labelledby="gsni-home-findings-heading"
    >
      <div className="gsni-home-findings__header">
        <div className="gsni-home-findings__header-copy">
          <h2 className="gsni-home-findings__heading" id="gsni-home-findings-heading">
            When games get tight, who changes?
          </h2>
          <p className="gsni-home-findings__lead">
            The Game-State Index (GSNI) compares whistle pace in clutch moments to
            league average (50). These three officials show the largest verified
            swings on 200+ game samples.
          </p>
        </div>
        <Link
          href={RESEARCH_HIGHLIGHT.href}
          className="gsni-home-findings__research-link rw-focus-ring"
        >
          How we measure clutch flags
        </Link>
      </div>
      <div className="gsni-home-findings__grid">
        {findings.map((finding) => (
          <FindingCard key={finding.refSlug} finding={finding} />
        ))}
      </div>
    </section>
  );
}
