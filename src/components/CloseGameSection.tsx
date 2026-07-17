import type { CloseGameMetrics } from "@/lib/close-game";

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
  if (tone === "positive") return "text-emerald-400";
  if (tone === "negative") return "text-rose-400";
  return "text-slate-400";
}

export function CloseGameSection({
  metrics,
  subjectLabel,
  league,
  embedded = false,
}: {
  metrics: CloseGameMetrics[];
  subjectLabel: string;
  league: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  embedded?: boolean;
}) {
  if (metrics.length === 0) return null;

  const scoreUnit =
    league === "NBA" || league === "CBB" ? "points" : league === "NHL" ? "goals" : "points";
  const sectionTitle =
    league === "NBA" || league === "CBB" ? "Tight-game proxy" : "Late-game proxy";
  const sectionClass = embedded ? "" : "section-block";

  return (
    <section id="close-game" className={sectionClass}>
      <div className={embedded ? "mb-4" : "mb-5"}>
        <h2 className={embedded ? "font-semibold tracking-tight" : "section-title"}>
          {sectionTitle}
        </h2>
        <p className={embedded ? "mt-1 text-sm font-normal text-slate-400" : "section-lead"}>
          How {subjectLabel} compares in competitive late-game windows vs full games. (Based on
          official box scores, not L2M reports).
        </p>
      </div>

      <div className="pressure-matrix-bento" aria-label="Pressure matrix">
        {metrics.map((m) => (
          <article key={m.window.id} className="ref-profile-section pressure-matrix-card">
            <div className="ref-table-section-header">
              <h3 className="font-semibold tracking-tight">{m.window.label}</h3>
              <p className="mt-1 text-xs font-normal text-slate-500">{m.coverageNote}</p>
            </div>

            {m.gameCount === 0 ? (
              <div className="ref-table-section-body px-4 py-6 text-center sm:px-5">
                <p className="text-sm font-normal text-slate-400">
                  No games in this window for {subjectLabel} yet.
                </p>
              </div>
            ) : (
              <>
                <div className="ref-table-section-body overflow-x-auto">
                  <table className="ref-data-table data-table pressure-matrix-table min-w-[480px] w-full">
                    <thead>
                      <tr className="data-table-head">
                        <th>Metric</th>
                        <th>Late-game avg</th>
                        <th>Season avg</th>
                        <th>Pressure impact Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.compareRows.map((row) => (
                        <tr key={row.label}>
                          <td className="text-sm font-normal text-slate-300">{row.label}</td>
                          <td className="font-tabular text-sm tabular-nums text-slate-50">
                            {row.windowValue}
                          </td>
                          <td className="font-tabular text-sm tabular-nums text-slate-400">
                            {row.fullGameValue}
                          </td>
                          <td
                            className={`font-tabular text-sm font-medium tabular-nums ${deltaClassName(row.delta)}`}
                          >
                            {row.delta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
