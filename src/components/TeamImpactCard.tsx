import { OverlayNavLink } from "@/components/OverlayNavLink";
import { TeamLogo } from "@/components/TeamLogo";
import { STATE_COLOR_CLASS } from "@/constants/colors";
import type { GameSlatePreviewTeamInsight } from "@/lib/game-slate-preview";
import type { SlateTeamLike, SlateTeamLogoSport } from "@/lib/slate-team-display";
import { formatPct, formatSigned } from "@/lib/stats-utils";

type TeamImpactCardProps = {
  team: SlateTeamLike;
  sport: SlateTeamLogoSport;
  teamAbbr: string;
  teamLabel: string;
  insights: GameSlatePreviewTeamInsight[];
  basePath: string;
};

export function TeamImpactCard({
  team,
  sport,
  teamAbbr,
  teamLabel,
  insights,
  basePath,
}: TeamImpactCardProps) {
  if (insights.length === 0) return null;

  return (
    <article className="game-slate-preview-team-impact-card" aria-label={`${teamAbbr} crew impact`}>
      <header className="game-slate-preview-team-impact-header">
        <TeamLogo team={team} sport={sport} size="sm" />
        <div className="game-slate-preview-team-impact-heading">
          <p className="game-slate-preview-team-impact-abbr">{teamAbbr}</p>
          <p className="game-slate-preview-team-impact-name">{teamLabel}</p>
        </div>
      </header>
      <ul className="game-slate-preview-team-impact-list">
        {insights.map((insight) => (
          <li key={`${insight.refSlug}-${teamAbbr}`}>
            <OverlayNavLink
              href={`${basePath}/refs/${insight.refSlug}`}
              className="game-slate-preview-team-impact-ref"
            >
              {insight.refName}
            </OverlayNavLink>
            <span className="game-slate-preview-team-impact-sep" aria-hidden>
              :
            </span>{" "}
            <span
              className={
                insight.winRateCritical
                  ? `game-slate-preview-team-impact-stat game-slate-preview-team-impact-stat--critical ${STATE_COLOR_CLASS.caution}`
                  : "game-slate-preview-team-impact-stat"
              }
            >
              {formatPct(insight.winRate)} win rate
            </span>
            <span className="game-slate-preview-team-impact-dot" aria-hidden>
              ·
            </span>
            <span
              className={`game-slate-preview-team-impact-stat font-tabular tabular-nums ${
                insight.foulsDeltaCritical
                  ? `game-slate-preview-team-impact-stat--critical ${
                      insight.foulsDelta > 0
                        ? STATE_COLOR_CLASS.caution
                        : insight.foulsDelta < 0
                          ? STATE_COLOR_CLASS.stable
                          : ""
                    }`
                  : ""
              }`}
            >
              {formatSigned(insight.foulsDelta)} fouls Δ
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
