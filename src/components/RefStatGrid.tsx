import Link from "next/link";
import type { RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { StatCell, StatStrip } from "./StatStrip";

export function RefStatGrid({ profile }: { profile: RefProfile }) {
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
          label="Avg total"
          value={String(profile.avgTotalPoints)}
          detail={`${totalDelta} vs league`}
        />
        <StatCell
          label="Over rate"
          value={formatPct(profile.overRate)}
          detail="225 baseline"
        />
      </StatStrip>
      <StatStrip>
        <StatCell
          label="Avg fouls"
          value={String(profile.avgFouls)}
          detail={`${foulsDelta} vs league`}
        />
        <StatCell label="Seasons" value={profile.seasons.join(", ")} />
        <StatCell label="ATS home" value="N/A" detail="no spread feed" />
      </StatStrip>
    </div>
  );
}

export function RefListItem({ profile }: { profile: RefProfile }) {
  const delta =
    profile.totalPointsDelta >= 0
      ? `+${profile.totalPointsDelta}`
      : String(profile.totalPointsDelta);
  const deltaColor =
    profile.totalPointsDelta > 2
      ? "text-emerald-700"
      : profile.totalPointsDelta < -2
        ? "text-rose-700"
        : "text-zinc-600";

  return (
    <Link
      href={`/refs/${profile.slug}`}
      className="group flex items-center justify-between border-b border-border-subtle px-4 py-3 transition last:border-b-0 hover:bg-zinc-50"
    >
      <div>
        <p className="text-sm font-medium text-zinc-900 group-hover:text-zinc-950">
          {profile.name}{" "}
          <span className="font-mono text-xs text-zinc-500">#{profile.number}</span>
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
          {profile.games} games · O/U {formatPct(profile.overRate)}
        </p>
      </div>
      <span className={`font-mono text-sm font-semibold tabular-nums ${deltaColor}`}>
        {delta} pts
      </span>
    </Link>
  );
}
