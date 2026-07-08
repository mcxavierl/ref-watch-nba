import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BarChart3,
  Grid3x3,
  Lightbulb,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";

const FEATURES = [
  {
    href: "/insights#tendencies",
    icon: BarChart3,
    title: "Official tendency index",
    description:
      "Rank every ref by foul pace, over rate, and scoring delta. Fully live on multi-season logs.",
  },
  {
    href: "/matrix",
    icon: Grid3x3,
    title: "Ref×team matrix",
    description:
      "Scan every ref and franchise pairing for whistle and scoring splits across seasons.",
  },
  {
    href: "/teams",
    icon: Users,
    title: "Team histories",
    description:
      "Crew splits, home-road bias, and whistle context for all 30 franchises.",
  },
  {
    href: "/refs",
    icon: UsersRound,
    title: "Refs and crews",
    description:
      "Profiles, game logs, and betting splits for every indexed official.",
  },
  {
    href: "/insights#findings",
    icon: Lightbulb,
    title: "Dataset findings",
    description:
      "Ranked historical patterns by effect size and sample depth, not narrative.",
  },
  {
    href: "/insights#trends",
    icon: TrendingUp,
    title: "League trends",
    description:
      "Ten-season scoring and foul baselines with year-over-year context.",
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
          Explore the full toolkit
        </h2>
        <p className="section-lead">
          Every tool below runs on historical multi-season data right now. No
          waiting for the schedule to return.
        </p>
      </div>

      <nav className="slate-feature-showcase-grid" aria-label="Explore historical tools">
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
