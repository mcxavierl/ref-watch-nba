import type { CloseGameMetrics } from "@/lib/close-game";
import { STATE_COLOR_CLASS } from "@/constants/colors";

function deltaTone(delta: string): "positive" | "negative" | "neutral" {
  const trimmed = delta.trim();
  if (/^[-+]?0(\.0+)?(\s|$)/.test(trimmed)) {
    return "neutral";
  }
  if (trimmed.startsWith("+")) {
    return "positive";
  }
  if (trimmed.startsWith("-")) {
    return "negative";
  }
  return "neutral";
}

function deltaClassName(delta: string): string {
  const tone = deltaTone(delta);
  if (tone === "positive") return STATE_COLOR_CLASS.stable;
  if (tone === "negative") return STATE_COLOR_CLASS.risk;
  return STATE_COLOR_CLASS.neutral;
}

export function CloseGameSection({
  metrics,
  subjectLabel,
  league,
  embedded = false,
}: {
  metrics: CloseGameMetrics[];
  subjectLabel: string;
  league: "NBA" | "NHL" | "WNBA" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  embedded?: boolean;
}) {
  if (metrics.length === 0) return null;

  const scoreUnit =
    league === "NBA" || league === "CBB" ? "points" : league === "NHL" ? "goals" : "points";
  const sectionTitle =
    league === "NBA" || league === "CBB" ? "Tight-game proxy" : "Late-game proxy";
  const sectionClass = embedded ? "ref-close-game-section ref-close-game-section--embedded" : "section-block";

  return (
    <section id="close-game" className={sectionClass}>
      <div className={embedded ? "ref-close-game-section-intro" : "mb-5"}>
        <h2 className={embedded ? "ref-profile-section-title m-0" : "section-title"}>
          {sectionTitle}
        </h2>
        <p
          className={
            embedded
              ? "ref-close-game-section-lead mt-1 text-sm font-normal text-slate-400"
              : "section-lead"
          }
        >
          How {subjectLabel} compares in competitive late-game windows vs full games. (Based on
          official box scores, not L2M reports).
        </p>
      </div>

      <div className="pressure-matrix-bento" aria-label="Pressure matrix">
        {metrics.map((m) => (
          <article key={m.window.id} className="ref-profile-section pressure-matrix-card">
            <div className="ref-table-section-header">
              <h3 className="ref-profile-section-title m-0">{m.window.label}</h3>
              <p className="ref-close-game-window-note mt-1 text-xs font-normal text-slate-500">
                {m.coverageNote}
              </p>
            </div>

            {m.gameCount === 0 ? (
              <div className="ref-table-section-body px-4 py-6 text-center sm:px-5">
                <p className="text-sm font-normal text-slate-400">
                  No games in this window for {subjectLabel} yet.
                </p>
              </div>
            ) : (
              <>
                <div className="ref-table-section-body">
                  <ul className="pressure-matrix-metrics">
                    {m.compareRows.map((row) => (
                      <li key={row.label} className="pressure-matrix-metric">
                        <p className="pressure-matrix-metric-label">{row.label}</p>
                        <dl className="pressure-matrix-metric-values">
                          <div className="pressure-matrix-metric-value">
                            <dt>Late-game avg</dt>
                            <dd className="font-tabular tabular-nums text-slate-50">{row.windowValue}</dd>
                          </div>
                          <div className="pressure-matrix-metric-value">
                            <dt>Season avg</dt>
                            <dd className="font-tabular tabular-nums text-slate-400">
                              {row.fullGameValue}
                            </dd>
                          </div>
                          <div className="pressure-matrix-metric-value">
                            <dt>Pressure impact</dt>
                            <dd
                              className={`font-tabular text-sm font-medium tabular-nums ${deltaClassName(row.delta)}`}
                            >
                              {row.delta}
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-border-subtle px-4 py-3 sm:px-5">
                  <p className="text-xs font-normal text-slate-500">
                    Over benchmark: {m.overBaseline} combined {scoreUnit} · Seasons:{" "}
                    {m.seasons.join(", ")} · {m.fullGameCount} total games in sample
                  </p>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
