import type { ReactNode } from "react";
import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import { TermHelp } from "@/components/TermHelp";
import type { RefBettingStats, RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { formatSigned } from "@/lib/stats-utils";

type QuickStat = {
  label: ReactNode;
  value: string;
  detail?: string;
};

export function RefProfileQuickStatsBar({
  profile,
  stats,
}: {
  profile: RefProfile;
  stats: RefBettingStats;
}) {
  const items: QuickStat[] = [
  {
    label: "Games",
    value: String(profile.games),
  },
  {
    label: "Avg home score",
    value: stats.avgHomeScore.toFixed(1),
  },
  {
    label: "Avg road score",
    value: stats.avgRoadScore.toFixed(1),
  },
  {
    label: (
      <MetricInfoHint hint="Average home team scoring margin (home score minus road score) in games this official worked.">
        Home avg margin
      </MetricInfoHint>
    ),
    value: formatSigned(stats.avgHomeMargin),
  },
];

  return (
    <section className="ref-profile-quick-stats" aria-label="Quick stats">
      {items.map((item) => (
        <div key={String(item.label)} className="ref-profile-quick-stat">
          <span className="ref-profile-quick-stat-label">{item.label}</span>
          <span className="ref-profile-quick-stat-value tabular-nums">{item.value}</span>
          {item.detail ? (
            <span className="ref-profile-quick-stat-detail tabular-nums">{item.detail}</span>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export function RefProfileSecondaryStats({
  profile,
}: {
  profile: RefProfile;
}) {
  const prov = profile.provenance;
  const items: QuickStat[] = [
    {
      label: "Avg total score",
      value: String(profile.avgTotalPoints),
      detail: `${formatSigned(profile.totalPointsDelta)} vs league`,
    },
    {
      label: "Fouls per game",
      value: String(profile.avgFouls),
      detail: `${formatSigned(profile.foulsDelta)} vs league`,
    },
    {
      label: (
        <TermHelp id="over-225">Over rate (225 proxy)</TermHelp>
      ),
      value: formatPct(profile.overRate),
      detail: prov?.overRate?.sampleSize
        ? `${prov.overRate.sampleSize} games`
        : undefined,
    },
  ];

  return (
    <section className="ref-profile-quick-stats ref-profile-quick-stats--secondary" aria-label="Scoring and whistle stats">
      {items.map((item) => (
        <div key={String(item.label)} className="ref-profile-quick-stat">
          <span className="ref-profile-quick-stat-label">{item.label}</span>
          <span className="ref-profile-quick-stat-value tabular-nums">{item.value}</span>
          {item.detail ? (
            <span className="ref-profile-quick-stat-detail tabular-nums">{item.detail}</span>
          ) : null}
        </div>
      ))}
    </section>
  );
}
