import Link from "next/link";
import type { RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { formatSigned } from "@/lib/stats-utils";
import { SampleGateBadge } from "./SampleGateBadge";
import { StatCell, StatStrip } from "./StatStrip";

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

  return (
    <div className="data-card">
      {prov?.sampleGate && (
        <div className="border-b border-border px-4 py-2 sm:px-5">
          <SampleGateBadge gate={prov.sampleGate} />
        </div>
      )}
      {!showMetrics ? (
        <div className="px-4 py-6 sm:px-5">
          <p className="text-sm text-zinc-600">
            Not enough games for reliable metrics yet ({profile.games} logged).
            Check back after this official clears the sample gate.
          </p>
        </div>
      ) : (
        <>
          <StatStrip>
            <StatCell label="Games" value={String(profile.games)} />
            <StatCell
              label={scoreLabel}
              value={String(profile.avgTotalPoints)}
              detail={`${totalDelta} vs league avg`}
              provenance={prov?.avgTotalPoints}
            />
            <StatCell
              label={overLabel}
              value={formatPct(profile.overRate)}
              detail={`Combined beat ${overBaseline} benchmark`}
              provenance={prov?.overRate}
            />
          </StatStrip>
          <StatStrip>
            <StatCell
              label={foulLabel}
              value={String(profile.avgFouls)}
              detail={`${foulsDelta} vs league avg`}
              provenance={prov?.avgFouls}
            />
            <StatCell label="Seasons" value={profile.seasons.join(", ")} />
            <StatCell label="Spread record" value="N/A" detail="No spread data yet" />
          </StatStrip>
        </>
      )}
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
