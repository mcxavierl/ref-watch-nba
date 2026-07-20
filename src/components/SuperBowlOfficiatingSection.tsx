import Link from "next/link";
import { SuperBowlInsightCard } from "@/components/SuperBowlInsightCard";
import {
  computeSuperBowlFindings,
  resolveSuperBowlGames,
  superBowlCatalogMeta,
} from "@/lib/nfl/super-bowl-officiating";
import { superBowlFindingCardModel } from "@/lib/nfl/super-bowl-insight-card";
import { EMPTY_DISPLAY } from "@/lib/finding-copy";

type SuperBowlOfficiatingSectionProps = {
  variant?: "hub" | "home";
  limit?: number;
};

export function SuperBowlOfficiatingSection({
  variant = "hub",
  limit = variant === "home" ? 4 : 6,
}: SuperBowlOfficiatingSectionProps) {
  const findings = computeSuperBowlFindings(limit);
  const games = resolveSuperBowlGames();
  const meta = superBowlCatalogMeta();

  if (findings.length === 0) return null;

  const title =
    variant === "home"
      ? "Super Bowl officiating"
      : "Super Bowl officiating through history";

  const lead =
    variant === "home"
      ? `${meta.gameCount} championship games since 2000: referee assignments, scoring extremes, and title-game context.`
      : `Curated referee assignments and scoring context for every Super Bowl from XXXIV (${meta.gameCount} games, 2000–present). Descriptive history only, not a betting signal.`;

  return (
    <section
      className={`section-block super-bowl-officiating${variant === "home" ? " super-bowl-officiating--home" : " super-bowl-officiating--hub"}`}
      aria-labelledby="super-bowl-officiating-heading"
    >
      <div className="overview-section-header">
        <h2 className="overview-section-title" id="super-bowl-officiating-heading">
          {title}
        </h2>
        <p className="overview-section-lead">{lead}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Source: {meta.source}
        </p>
      </div>

      <ul className="super-bowl-insight-grid rankings-insight-grid mt-4" role="list">
        {findings.map((finding) => (
          <SuperBowlInsightCard
            key={finding.id}
            card={superBowlFindingCardModel(finding)}
          />
        ))}
      </ul>

      {variant === "hub" ? (
        <details className="super-bowl-catalog mt-6">
          <summary className="super-bowl-catalog-summary">
            Full Super Bowl referee log ({games.length} games)
          </summary>
          <div className="super-bowl-catalog-table-wrap mt-3 overflow-x-auto">
            <table className="super-bowl-catalog-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th scope="col">SB</th>
                  <th scope="col">Date</th>
                  <th scope="col">Matchup</th>
                  <th scope="col">Score</th>
                  <th scope="col">Penalties</th>
                  <th scope="col">Referee</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.number}>
                    <td>{game.roman}</td>
                    <td>{game.date}</td>
                    <td>
                      {game.winnerLabel} vs {game.loserLabel}
                    </td>
                    <td>
                      {game.winnerScore}–{game.loserScore}
                      {game.overtime ? " (OT)" : ""}
                    </td>
                    <td className="font-tabular tabular-nums">
                      {game.totalPenalties ?? EMPTY_DISPLAY}
                    </td>
                    <td>
                      {game.refereeSlug ? (
                        <Link
                          href={`/nfl/refs/${game.refereeSlug}`}
                          className="text-raptors hover:underline"
                        >
                          {game.referee}
                        </Link>
                      ) : (
                        game.referee
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}
