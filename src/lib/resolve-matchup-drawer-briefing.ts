import type {
  GameSlateMatchupBriefing,
  GameSlatePreviewPayload,
} from "@/lib/game-slate-preview";
import { formatPct } from "@/lib/stats-utils";

/** Client-safe fallback when snapshot briefing lines are empty. */
export function resolveMatchupDrawerBriefing(
  preview: GameSlatePreviewPayload,
): GameSlateMatchupBriefing {
  const awayAbbr = preview.awayAbbr ?? preview.awayTeam;
  const homeAbbr = preview.homeAbbr ?? preview.homeTeam;
  const existing = preview.matchupBriefing;
  const scoringLabel = preview.scoringLabel.toLowerCase();
  const whistleLabel = preview.whistleLabel.toLowerCase();

  if (existing && existing.lines.length > 0) {
    return existing;
  }

  const lines: string[] = [];

  if ((existing?.h2hGames ?? preview.sampleGames) > 0) {
    const h2hGames = existing?.h2hGames ?? preview.sampleGames;
    const avgTotalPoints = existing?.avgTotalPoints ?? preview.avgTotalPoints;
    const avgFouls = existing?.avgFouls ?? preview.avgFouls;
    const overRate = existing?.overRate ?? preview.overRate;
    const window = Math.min(h2hGames, 5);

    lines.push(
      `Last ${window} meeting${window === 1 ? "" : "s"}: ${avgTotalPoints} avg ${scoringLabel} · ${avgFouls} avg ${whistleLabel}`,
    );
    lines.push(
      `Head-to-head over rate: ${formatPct(overRate)} across ${h2hGames} meetings`,
    );
    if (existing?.lastMeeting) {
      lines.push(existing.lastMeeting);
    }
  }

  if (lines.length === 0) {
    lines.push(`${awayAbbr} at ${homeAbbr}: recent team logs publish when available.`);
  }

  return {
    headline: existing?.headline ?? `${awayAbbr} at ${homeAbbr} matchup sheet`,
    lines,
    h2hGames: existing?.h2hGames ?? preview.sampleGames ?? 0,
    avgTotalPoints: existing?.avgTotalPoints ?? preview.avgTotalPoints ?? 0,
    avgFouls: existing?.avgFouls ?? preview.avgFouls ?? 0,
    overRate: existing?.overRate ?? preview.overRate ?? 0.5,
    lastMeeting: existing?.lastMeeting,
  };
}
