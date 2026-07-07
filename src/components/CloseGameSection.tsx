import { ProvenanceMarker } from "@/components/ProvenanceMarker";
import { SampleGateBadge } from "@/components/SampleGateBadge";
import { TermHelp } from "@/components/TermHelp";
import type { CloseGameMetrics } from "@/lib/close-game";

export function CloseGameSection({
  metrics,
  subjectLabel,
  league,
}: {
  metrics: CloseGameMetrics[];
  subjectLabel: string;
  league: "NBA" | "NHL";
}) {
  if (metrics.length === 0) return null;

  const scoreUnit = league === "NBA" ? "points" : "goals";
  const sectionTitle =
    league === "NBA" ? "Close-game / L2M proxy" : "Late-game / OT proxy";

  return (
    <section id="close-game" className="section-block scroll-mt-24">
      <div className="mb-4">
        <h2 className="section-title">{sectionTitle}</h2>
        <p className="section-lead">
          How {subjectLabel} compares in competitive late-game windows vs full
          games.{" "}
          <TermHelp id="close-game-proxy">
            Proxy windows
          </TermHelp>{" "}
          — not official NBA L2M reports.
        </p>
      </div>

      <div className="space-y-6">
        {metrics.map((m) => (
          <div key={m.window.id} className="data-card">
            <div className="border-b border-border-subtle px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-900">
                  {m.window.label}
                </h3>
                <SampleGateBadge gate={m.sampleGate} />
                <ProvenanceMarker provenance={m.provenance} compact />
              </div>
              <p className="mt-2 text-sm text-zinc-600">{m.window.description}</p>
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
                  <table className="data-table min-w-[480px]">
                    <thead>
                      <tr className="data-table-head">
                        <th>Metric</th>
                        <th>{m.window.label}</th>
                        <th>Full game</th>
                        <th>Δ vs full</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {m.compareRows.map((row) => (
                        <tr key={row.label}>
                          <td className="px-4 py-3 text-sm text-zinc-700 sm:px-5">
                            {row.label}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm tabular-nums text-zinc-900 sm:px-5">
                            {row.windowValue}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm tabular-nums text-zinc-600 sm:px-5">
                            {row.fullGameValue}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm tabular-nums text-zinc-800 sm:px-5">
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
