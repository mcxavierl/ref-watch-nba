import { Scale } from "lucide-react";
import { HighlightStatCard } from "@/components/HighlightStatCard";
import { formatDeltaPp } from "@/lib/data-maturity";
import type { LeagueId } from "@/lib/leagues";
import {
  formatMatrixHighlightBaseline,
  type MatrixExtremeHighlight,
} from "@/lib/ref-team-matrix";
import { formatPct } from "@/lib/stats-utils";

type MatrixAvatarSport = "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";

function matrixAvatarSport(leagueId: LeagueId): MatrixAvatarSport | undefined {
  if (
    leagueId === "nba" ||
    leagueId === "nhl" ||
    leagueId === "nfl" ||
    leagueId === "epl" ||
    leagueId === "laliga" ||
    leagueId === "cbb" ||
    leagueId === "cfb"
  ) {
    return leagueId;
  }
  return undefined;
}

function matrixExtremeBody(
  item: MatrixExtremeHighlight,
  entityLabel: "ref" | "official",
): string {
  const withLabel = entityLabel === "official" ? "official" : "ref";
  return `${withLabel}×team ${item.wins}-${item.losses} (${formatPct(item.winRate)}) in ${item.games} games vs team sample baseline ${formatMatrixHighlightBaseline(item)}.`;
}

export function MatrixExtremeSection({
  extremes,
  basePath,
  title,
  lead,
  entityLabel = "ref",
  leagueId,
}: {
  extremes: MatrixExtremeHighlight[];
  basePath: string;
  title: string;
  lead: string;
  entityLabel?: "ref" | "official";
  leagueId: LeagueId;
}) {
  if (extremes.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">{title}</h2>
      <p className="section-lead">{lead}</p>
      <ul className="rankings-insight-grid rankings-insight-grid--hero">
        {extremes.map((item) => (
          <HighlightStatCard
            key={`${item.refSlug}-${item.teamAbbr}`}
            leagueId={leagueId}
            insightKind={`matrix-extreme-${item.kind}`}
            accent="balance"
            tone={item.kind === "high" ? "positive" : "negative"}
            icon={Scale}
            kicker={item.kind === "high" ? "Above baseline" : "Below baseline"}
            refName={item.refName}
            refSlug={item.refSlug}
            basePath={basePath}
            avatarSport={matrixAvatarSport(leagueId)}
            refMeta={item.teamLabel}
            statValue={formatDeltaPp(item.deltaPts)}
            statLabel="vs team baseline"
            body={matrixExtremeBody(item, entityLabel)}
          />
        ))}
      </ul>
    </section>
  );
}
