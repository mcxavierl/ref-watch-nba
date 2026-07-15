import { TermHelp } from "@/components/TermHelp";
import type { CloseGameMetrics } from "@/lib/close-game";

function deltaTone(delta: string): "positive" | "negative" | "neutral" {
  const trimmed = delta.trim();
  if (trimmed.startsWith("+") && !/^\+0(\.0+)?(\s|$)/.test(trimmed)) {
    return "positive";
  }
  if (trimmed.startsWith("-")) {
    return "negative";
  }
  return "neutral";
}

function deltaClassName(delta: string): string {
  const tone = deltaTone(delta);
  if (tone === "positive") return "ref-delta-positive";
  if (tone === "negative") return "ref-delta-negative";
  return "";
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
      <div className={embedded ? "mb-3" : "mb-4"}>
        <h2 className={embedded ? "text-sm font-semibold text-zinc-800" : "section-title"}>
          {sectionTitle}
        </h2>
        <p className={embedded ? "mt-1 text-xs text-zinc-500" : "section-lead"}>
          How {subjectLabel} compares in competitive late-game windows vs full
          games.{" "}
          <TermHelp id="close-game-proxy">
            Proxy windows
          </TermHelp>
          , not official NBA L2M reports.
        </p>
      </div>

      <div className="space-y-6">
        {metrics.map((m) => (
          <div key={m.window.id} className="data-card">
            <div className="ref-table-section-header">
              <h3 className="text-sm font-semibold text-zinc-900">{m.window.label}</h3>
              <p className="mt-1 text-sm text-zinc-600">{m.window.description}</p>
              <p className="mt-1 text-xs text-zinc-500">{m.coverageNote}</p>
            </div>

            {m.honestyBanner && (
              <div className="border-b border-border-subtle bg-amber-50/70 px-4 py-2.5 sm:px-5">
                <p className="text-xs leading-relaxed text-amber-900">
                  {m.honestyBanner}
                </p>
              </div>
            )}

            {m.gameCount === 0 ? (
              <div className="px-4 py-6 text-center sm:px-5">
                <p className="text-sm text-zinc-600">
                  No games in this window for {subjectLabel} yet.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="ref-data-table data-table min-w-[480px]">
                    <thead>
                      <tr className="data-table-head">
                        <th>Metric</th>
                        <th>{m.window.label}</th>
                        <th>Full game</th>
                        <th>Δ vs full</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.compareRows.map((row) => (
                        <tr key={row.label}>
                          <td className="text-sm text-zinc-700">{row.label}</td>
                          <td className="font-mono text-sm tabular-nums text-zinc-900">
                            {row.windowValue}
                          </td>
                          <td className="font-mono text-sm tabular-nums text-zinc-600">
                            {row.fullGameValue}
                          </td>
                          <td
                            className={`font-mono text-sm tabular-nums text-zinc-800 ${deltaClassName(row.delta)}`.trim()}
                          >
                            {row.delta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-border-subtle px-4 py-3 sm:px-5">
                  <p className="text-xs text-zinc-500">
                    Over benchmark: {m.overBaseline} combined {scoreUnit} ·
                    Seasons: {m.seasons.join(", ")} · {m.fullGameCount} total
                    games in sample
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
