import Link from "next/link";
import type { RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { formatSigned } from "@/lib/stats-utils";
import {
  RefDashboardStatCell,
  RefDashboardStatGrid,
} from "./RefDashboardStatGrid";

export function RefStatGrid({
  profile,
  overBaseline = 225,
  foulLabel = "Fouls per game",
  scoreLabel = "Avg combined score",
  overLabel = "Games over benchmark",
  showMetrics = true,
}: {
  profile: RefProfile;
  overBaseline?: number;
  foulLabel?: string;
  scoreLabel?: string;
  overLabel?: string;
  showMetrics?: boolean;
}) {
  const totalDelta = formatSigned(profile.totalPointsDelta);
  const foulsDelta = formatSigned(profile.foulsDelta);
  const prov = profile.provenance;

  if (!showMetrics) {
    return (
      <section className="data-card px-4 py-6 sm:px-5">
        <p className="text-sm text-zinc-600">
          Not enough games for reliable metrics yet ({profile.games} logged).
          Check back after this official clears the sample gate.
        </p>
      </section>
    );
  }

  return (
    <section className="data-card">
      <div className="ref-table-section-header">
        <h2 className="text-sm font-semibold text-zinc-800">General stats</h2>
      </div>
      <div className="px-4 py-4 sm:px-5">
        <RefDashboardStatGrid>
          <RefDashboardStatCell label="Games" value={String(profile.games)} />
          <RefDashboardStatCell
            label={scoreLabel}
            value={String(profile.avgTotalPoints)}
            detail={`${totalDelta} vs league avg`}
            provenance={prov?.avgTotalPoints}
          />
          <RefDashboardStatCell
            label={overLabel}
            value={formatPct(profile.overRate)}
            detail={`Combined beat ${overBaseline} benchmark`}
            provenance={prov?.overRate}
          />
          <RefDashboardStatCell
            label={foulLabel}
            value={String(profile.avgFouls)}
            detail={`${foulsDelta} vs league avg`}
            provenance={prov?.avgFouls}
          />
          <RefDashboardStatCell
            label="Seasons"
            value={profile.seasons.join(", ")}
          />
          <RefDashboardStatCell
            label="Spread record"
            value="N/A"
            detail="No spread data yet"
          />
        </RefDashboardStatGrid>
      </div>
    </section>
  );
}

export function RefListItem({
  profile,
  basePath = "",
  overBaseline = 225,
  deltaUnit = "pts",
}: {
  profile: RefProfile;
  basePath?: string;
  overBaseline?: number;
  deltaUnit?: string;
}) {
  const deltaThreshold = overBaseline > 50 ? 2 : 0.3;
  const delta = formatSigned(profile.totalPointsDelta);
  const deltaColor =
    profile.totalPointsDelta > deltaThreshold
      ? "text-emerald-700"
      : profile.totalPointsDelta < -deltaThreshold
        ? "text-rose-700"
        : "text-zinc-600";

  return (
    <Link
      href={`${basePath}/refs/${profile.slug}`}
      className="group flex items-center justify-between border-b border-border-subtle px-4 py-3 transition last:border-b-0 hover:bg-zinc-50"
    >
      <div>
        <p className="text-base font-medium text-zinc-900 group-hover:text-zinc-950">
          {profile.name}{" "}
          <span className="font-mono text-sm text-zinc-500">#{profile.number}</span>
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          {profile.games} games · {formatPct(profile.overRate)} over {overBaseline}
        </p>
      </div>
      <span className={`font-mono text-base font-semibold tabular-nums ${deltaColor}`}>
        {delta} {deltaUnit}
      </span>
    </Link>
  );
}
