import "./homepage-dual-narrative.css";

const EXPLAINABILITY_POINTS = [
  "Every projection ships with ranked evidence drivers, not just a headline number.",
  "Crew, team, and historical matchup factors are separated so producers can cite the why.",
  "Sample gates and confidence ratings surface before you open a full game preview.",
] as const;

export function WhyRefWatchExplainability() {
  return (
    <section
      className="why-refwatch-explainability section-block"
      aria-labelledby="why-refwatch-explainability-heading"
    >
      <div className="overview-section-header overview-section-header--compact">
        <h2 className="overview-section-title" id="why-refwatch-explainability-heading">
          Every projection includes the evidence behind it
        </h2>
        <p className="overview-section-lead">
          RefWatch is built for explainability first. Broadcast and research teams get the
          observational proof chain, not black-box picks.
        </p>
      </div>

      <ol className="why-refwatch-explainability-points">
        {EXPLAINABILITY_POINTS.map((point, index) => (
          <li key={point} className="why-refwatch-explainability-point">
            <span className="why-refwatch-explainability-index" aria-hidden>
              {index + 1}
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
