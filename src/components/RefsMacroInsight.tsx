import type { RefsDirectoryMeta } from "@/lib/refs-directory";
import type { LeagueConfig } from "@/lib/leagues";

export function RefsMacroInsight({
  meta,
  league,
  scopeLabel = "Last 10 seasons",
}: {
  meta: RefsDirectoryMeta;
  league: LeagueConfig;
  scopeLabel?: string;
}) {
  const seasonPhrase =
    meta.seasonCount === 1 ? "1 season" : `${meta.seasonCount} seasons`;

  return (
    <aside className="refs-macro-insight" aria-label="Dataset sample size">
      <p className="refs-macro-insight-kicker">{scopeLabel} sample size</p>
      <p className="refs-macro-insight-body">
        <strong className="refs-macro-insight-stat">
          {meta.totalGameRecordsLabel}
        </strong>{" "}
        games logged over {seasonPhrase}.{" "}
        <strong className="refs-macro-insight-stat">{meta.qualifiedCount}</strong>{" "}
        {meta.qualifiedCount === 1
          ? league.officialNoun
          : league.officialNounPlural}{" "}
        cleared the {meta.minSampleSize}+ game sample filter in this window.
      </p>
    </aside>
  );
}
