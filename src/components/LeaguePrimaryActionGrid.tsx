import Link from "next/link";
import { ArrowRight, Grid3x3, TrendingUp, UsersRound } from "lucide-react";
import { insightsViewHref } from "@/lib/insights-routes";
import { leagueHref, type LeagueId } from "@/lib/leagues";

export type PrimaryActionLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"
>;

export function LeaguePrimaryActionGrid({
  leagueId,
}: {
  leagueId: PrimaryActionLeagueId;
}) {
  const actions = [
    {
      href: insightsViewHref(leagueId, "trends"),
      label: "Explore Trends",
      icon: TrendingUp,
    },
    {
      href: leagueHref(leagueId, "/matrix"),
      label: "Matchup Matrix",
      icon: Grid3x3,
    },
    {
      href: leagueHref(leagueId, "/refs"),
      label: "Ref Profiles",
      icon: UsersRound,
    },
  ] as const;

  return (
    <nav
      className="league-primary-actions"
      data-league={leagueId}
      aria-label="Primary analytics actions"
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.href} href={action.href} className="league-primary-action">
            <Icon className="league-primary-action-icon" aria-hidden />
            <span className="league-primary-action-label">{action.label}</span>
            <ArrowRight className="league-primary-action-arrow" aria-hidden />
          </Link>
        );
      })}
    </nav>
  );
}
