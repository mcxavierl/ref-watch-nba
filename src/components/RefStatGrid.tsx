import Link from "next/link";
import type { RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { StatCell, StatStrip } from "./StatStrip";

export function RefStatGrid({
  profile,
  overBaseline = 225,
  foulLabel = "Fouls per game",
  scoreLabel = "Avg combined score",
  overLabel = "Games over benchmark",
}: {
  profile: RefProfile;
  overBaseline?: number;
  foulLabel?: string;
  scoreLabel?: string;
  overLabel?: string;
}) {
  const totalDelta =
    profile.totalPointsDelta >= 0
      ? `+${profile.totalPointsDelta}`
      : String(profile.totalPointsDelta);
  const foulsDelta =
    profile.foulsDelta >= 0
      ? `+${profile.foulsDelta}`
      : String(profile.foulsDelta);

  return (
    <div className="data-card">
      <StatStrip>
        <StatCell label="Games" value={String(profile.games)} />
        <StatCell
          label={scoreLabel}
          value={String(profile.avgTotalPoints)}
          detail={`${totalDelta} vs league avg`}
        />
        <StatCell
          label={overLabel}
          value={formatPct(profile.overRate)}
          detail={`Combined beat ${overBaseline} benchmark`}
        />
      </StatStrip>
      <StatStrip>
        <StatCell
          label={foulLabel}
          value={String(profile.avgFouls)}
          detail={`${foulsDelta} vs league avg`}
        />
        <StatCell label="Seasons" value={profile.seasons.join(", ")} />
        <StatCell label="Spread record" value="N/A" detail="No spread data yet" />
      </StatStrip>
    </div>
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
  const delta =
    profile.totalPointsDelta >= 0
      ? `+${profile.totalPointsDelta}`
      : String(profile.totalPointsDelta);
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
