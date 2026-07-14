import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, BarChart3, Grid3x3, Users, UsersRound } from "lucide-react";
import { insightsViewHref } from "@/lib/insights-routes";
import { leagueHref } from "@/lib/leagues";

const FEATURES = [
  {
    href: insightsViewHref("nba", "tendencies"),
    icon: BarChart3,
    title: "Official tendency index",
    description:
      "Rank refs by foul pace, over rate, and scoring delta on multi-season logs.",
  },
  {
    href: leagueHref("nba", "/matrix"),
    icon: Grid3x3,
    title: "Ref×team matrix",
    description:
      "Whistle and scoring splits for every ref and franchise pairing.",
  },
  {
    href: leagueHref("nba", "/teams"),
    icon: Users,
    title: "Team histories",
    description:
      "Crew splits, home-road bias, and whistle context for all 30 franchises.",
  },
  {
    href: leagueHref("nba", "/refs"),
    icon: UsersRound,
    title: "Ref profiles",
    description:
      "Profiles, game logs, and betting splits for every indexed official.",
  },
] as const;

export function SlateFeatureShowcase() {
  return (
    <section
      className="slate-feature-showcase section-block"
      aria-labelledby="slate-feature-showcase-heading"
    >
      <div className="slate-feature-showcase-header">
        <h2 className="section-title" id="slate-feature-showcase-heading">
          Browse the dataset
        </h2>
        <p className="section-lead">
          Tendency index, ref×team matrix, franchise histories, and official
          profiles on multi-season data.
        </p>
      </div>

      <nav className="slate-feature-showcase-grid" aria-label="Historical tools">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className="slate-feature-showcase-card"
              style={{ "--feature-i": index } as CSSProperties}
            >
              <span className="slate-feature-showcase-icon" aria-hidden>
                <Icon />
              </span>
              <span className="slate-feature-showcase-title">{feature.title}</span>
              <span className="slate-feature-showcase-desc">{feature.description}</span>
              <ArrowRight className="slate-feature-showcase-arrow" aria-hidden />
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
