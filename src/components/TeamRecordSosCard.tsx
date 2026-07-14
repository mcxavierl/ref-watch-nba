import type { TeamSampleRecord } from "@/lib/teamRecord";
import type { TeamStrengthOfSchedule } from "@/lib/nba-strength-of-schedule";
import {
  formatOpponentAvgWinPct,
  formatWinsAboveExpected,
  roundExpectedRecord,
} from "@/lib/nba-strength-of-schedule";
import { formatBaselinePct, formatPct } from "@/lib/stats-utils";

const TIER_LABELS = {
  top10: "Top 10 opponents",
  mid10: "11–20 opponents",
  bottom10: "Bottom 10 opponents",
} as const;

type TeamRecordSosCardProps = {
  record: TeamSampleRecord;
  sos: TeamStrengthOfSchedule;
  teamName: string;
  className?: string;
};

export function TeamRecordSosCard({
  record,
  sos,
  teamName,
  className = "",
}: TeamRecordSosCardProps) {
  const expected = roundExpectedRecord(sos.expectedWins, sos.expectedLosses);
  const deltaLabel = formatWinsAboveExpected(sos.winsAboveExpected);

  return (
    <div className={`team-record-sos-card ${className}`.trim()}>
      <p className="team-record-sos-primary">
        {record.games > 0
          ? `${record.wins}-${record.losses} (${formatBaselinePct(record.games, record.winRate)})`
          : "n/a"}
      </p>
      <p className="team-record-sos-context">
        vs. opp avg {formatOpponentAvgWinPct(sos.avgOpponentWinPct)} · expected{" "}
        {expected.wins}-{expected.losses} · {deltaLabel} above avg
      </p>

      <details className="team-record-sos-splits">
        <summary>Splits</summary>
        <ul className="team-record-sos-splits-list">
          {(Object.keys(TIER_LABELS) as (keyof typeof TIER_LABELS)[]).map(
            (tier) => {
              const split = sos.splits[tier];
              return (
                <li key={tier} className="team-record-sos-splits-item">
                  <span className="team-record-sos-splits-label">
                    {TIER_LABELS[tier]}
                  </span>
                  <span className="team-record-sos-splits-value">
                    {split.wins}-{split.losses} ({formatPct(split.winRate)}) ·{" "}
                    {split.games} gp
                  </span>
                </li>
              );
            },
          )}
        </ul>
        <p className="team-record-sos-splits-note">
          Opponent tiers ranked by season-end win% within each season. Schedule
          context uses the same {teamName} sample as the record above.
        </p>
      </details>
    </div>
  );
}
