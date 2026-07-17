import Link from "next/link";
import { loadGsniHomeFindings, type GsniHomeFinding } from "@/lib/gsni-home-findings";

function FindingCard({ finding }: { finding: GsniHomeFinding }) {
  return (
    <Link
      href={finding.href}
      className={`gsni-home-finding gsni-home-finding--${finding.band}`}
    >
      <span className="gsni-home-finding__score" aria-hidden>
        {finding.gsni}
      </span>
      <span className="gsni-home-finding__copy">
        <span className="gsni-home-finding__headline">{finding.headline}</span>
        <span className="gsni-home-finding__meta">{finding.detail}</span>
      </span>
    </Link>
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
        <h2 className="gsni-home-findings__title" id="gsni-home-findings-heading">
          Game-State Index findings
        </h2>
        <p className="gsni-home-findings__lead">
          Three high-sample NFL officials with the strongest clutch-state whistle profiles.
        </p>
      </div>
      <div className="gsni-home-findings__grid">
        {findings.map((finding) => (
          <FindingCard key={finding.refSlug} finding={finding} />
        ))}
      </div>
    </section>
  );
}
