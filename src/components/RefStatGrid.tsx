import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
import type { RefProfile } from "@/lib/types";
import { formatPct } from "@/lib/data";
import { formatRefProfileSeasonCount } from "@/lib/finding-copy";
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
      <p className="text-sm font-normal text-slate-400">
        Not enough games for reliable metrics yet ({profile.games.toLocaleString()} logged).
        Check back after this official clears the sample gate.
      </p>
    );
  }

  return (
    <>
      <div className="ref-table-section-header">
        <h2 className="font-semibold tracking-tight">General stats</h2>
      </div>
      <div className="ref-table-section-body">
        <RefDashboardStatGrid>
          <RefDashboardStatCell label="Games" value={String(profile.games)} />
          <RefDashboardStatCell
            label={scoreLabel}
            value={String(profile.avgTotalPoints)}
            detail={`${totalDelta} vs league avg`}
            detailDelta={profile.totalPointsDelta}
            sampleGames={profile.games}
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
            detailDelta={profile.foulsDelta}
            sampleGames={profile.games}
            provenance={prov?.avgFouls}
          />
          <RefDashboardStatCell
            label="Seasons"
            value={formatRefProfileSeasonCount(profile.seasons)}
          />
        </RefDashboardStatGrid>
      </div>
    </>
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
  const delta = formatSigned(profile.totalPointsDelta);

  return (
    <Link
      href={`${basePath}/refs/${profile.slug}`}
      className="group flex items-center justify-between border-b border-border-subtle px-4 py-3 transition last:border-b-0 hover:bg-zinc-50"
    >
      <div>
        <p className="text-base font-medium text-zinc-900 group-hover:text-zinc-950">
          {profile.name}{" "}
          <RefJerseyNumber
            number={profile.number}
            className="font-tabular text-sm text-zinc-500"
          />
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          {profile.games} games · {formatPct(profile.overRate)} over {overBaseline}
        </p>
      </div>
      <span className="font-tabular text-base font-medium tabular-nums text-primary-muted">
        {delta} {deltaUnit}
      </span>
    </Link>
  );
}
