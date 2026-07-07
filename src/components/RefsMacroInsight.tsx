import type { RefsDirectoryMeta } from "@/lib/refs-directory";
import type { LeagueConfig } from "@/lib/leagues";

export function RefsMacroInsight({
  meta,
  league,
}: {
  meta: RefsDirectoryMeta;
  league: LeagueConfig;
}) {
  const seasonLabel =
    meta.seasonCount === 1 ? "1 season" : `${meta.seasonCount} consecutive seasons`;

  return (
    <aside className="refs-macro-insight" aria-label="Dataset sample size">
      <p className="refs-macro-insight-kicker">5-year sample size</p>
      <p className="refs-macro-insight-body">
        Analyzing{" "}
        <strong className="refs-macro-insight-stat">
          {meta.totalGameRecordsLabel}
        </strong>{" "}
        total game records across {seasonLabel}. Only{" "}
        <strong className="refs-macro-insight-stat">{meta.qualifiedCount}</strong>{" "}
        {meta.qualifiedCount === 1
          ? league.officialNoun
          : league.officialNounPlural}{" "}
        meet the multi-year volume baseline ({meta.minSampleSize}+ games),
        ensuring deep statistical reliability.
      </p>
    </aside>
  );
}
