"use client";

import Link from "next/link";
import { ClutchConsistencyMetricLabel } from "@/components/clutch-consistency/ClutchConsistencyMetricLabel";
import { ClutchConsistencyRing } from "@/components/clutch-consistency/ClutchConsistencyRing";
import { RESEARCH_HIGHLIGHT } from "@/config/research-highlight";
import type { GsniHomeFinding } from "@/lib/gsni-home-findings";

function FindingCard({ finding }: { finding: GsniHomeFinding }) {
  return (
    <article className={`cci-finding cci-finding--${finding.consistencyProfile}`}>
      <div className="cci-finding__copy">
        <p className="cci-finding__kicker">NFL clutch profile</p>
        <h3 className="cci-finding__title">{finding.headline}</h3>
        <p className="cci-finding__summary">{finding.summary}</p>
      </div>

      <div className="cci-finding__metric">
        <ClutchConsistencyRing
          index={finding.consistencyIndex}
          profile={finding.consistencyProfile}
        />
        <div className="cci-finding__metric-copy">
          <ClutchConsistencyMetricLabel />
          <p className="cci-finding__minutes">{finding.minutesLine}</p>
          {finding.confidenceTag ? (
            <span className="cci-finding__confidence">{finding.confidenceTag}</span>
          ) : null}
        </div>
      </div>

      <dl className="cci-finding__stats">
        {finding.stats.map((stat) => (
          <div key={stat.label} className="cci-finding__stat">
            <dt className="cci-finding__stat-label">{stat.label}</dt>
            <dd className="cci-finding__stat-value">{stat.value}</dd>
            <div className="cci-finding__stat-bar" aria-hidden>
              <span
                className="cci-finding__stat-bar-fill"
                style={{ width: `${stat.barPct}%` }}
              />
            </div>
          </div>
        ))}
      </dl>

      <div className="cci-finding__footer">
        <Link href={finding.href} className="cci-finding__link rw-focus-ring">
          View ref profile
        </Link>
      </div>
    </article>
  );
}

type GameStateIndexFindingsViewProps = {
  findings: GsniHomeFinding[];
};

export function GameStateIndexFindingsView({ findings }: GameStateIndexFindingsViewProps) {
  return (
    <section className="cci-findings" aria-labelledby="cci-findings-heading">
      <div className="cci-findings__header">
        <div className="cci-findings__header-copy">
          <h2 className="cci-findings__heading" id="cci-findings-heading">
            Clutch consistency profiles
          </h2>
          <p className="cci-findings__lead">
            The Clutch Consistency Index compares penalty frequency in high-leverage
            minutes to each official&apos;s career baseline. We publish only verified
            profiles with 200+ career games and a transparent high-leverage minute count.
          </p>
        </div>
        <Link
          href={RESEARCH_HIGHLIGHT.href}
          className="cci-findings__research-link rw-focus-ring"
        >
          How we define clutch minutes
        </Link>
      </div>

      <div className="cci-findings__grid">
        {findings.map((finding) => (
          <FindingCard key={finding.refSlug} finding={finding} />
        ))}
      </div>
    </section>
  );
}
