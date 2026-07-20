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
                  <div className="pressure-matrix-table-scroll">
                    <table className="ref-data-table data-table pressure-matrix-table">
                      <thead>
                        <tr className="data-table-head">
                          <th className="whitespace-nowrap">Metric</th>
                          <th className="data-table-num whitespace-nowrap">Late-game avg</th>
                          <th className="data-table-num whitespace-nowrap">Season avg</th>
                          <th className="data-table-num whitespace-nowrap">Pressure impact Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.compareRows.map((row) => (
                          <tr key={row.label}>
                            <td className="whitespace-nowrap text-sm font-normal text-slate-300">
                              {row.label}
                            </td>
                            <td className="data-table-num whitespace-nowrap font-tabular tabular-nums text-slate-50">
                              {row.windowValue}
                            </td>
                            <td className="data-table-num whitespace-nowrap font-tabular tabular-nums text-slate-400">
                              {row.fullGameValue}
                            </td>
                            <td
                              className={`data-table-num whitespace-nowrap font-tabular text-sm font-medium tabular-nums ${deltaClassName(row.delta)}`}
                            >
                              {row.delta}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
