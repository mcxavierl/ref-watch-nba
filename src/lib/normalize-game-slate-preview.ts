import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Coerce snapshot / API preview payloads into a safe drawer shape. */
export function normalizeGameSlatePreview(
  preview: GameSlatePreviewPayload | null | undefined,
): GameSlatePreviewPayload | null {
  if (!preview?.gameId || !preview?.leagueId) return null;

  const crew = Array.isArray(preview.crew)
    ? preview.crew.filter(
        (official): official is GameSlatePreviewPayload["crew"][number] =>
          Boolean(official?.name && official?.slug),
      )
    : [];

  const refTeamRows = Array.isArray(preview.refTeamRows) ? preview.refTeamRows : [];
  const teamImpacts = Array.isArray(preview.teamImpacts)
    ? preview.teamImpacts.map((impact) => ({
        teamAbbr: impact?.teamAbbr ?? "",
        teamLabel: impact?.teamLabel ?? impact?.teamAbbr ?? "",
        insights: Array.isArray(impact?.insights) ? impact.insights : [],
      }))
    : [];
  const storylines = Array.isArray(preview.storylines) ? preview.storylines : [];

  const awayTeam = preview.awayTeam ?? preview.awayAbbr ?? "Away";
  const homeTeam = preview.homeTeam ?? preview.homeAbbr ?? "Home";

  return {
    ...preview,
    matchup: preview.matchup ?? `${awayTeam} @ ${homeTeam}`,
    awayTeam,
    homeTeam,
    basePath: preview.basePath ?? `/${preview.leagueId}`,
    leagueLabel: preview.leagueLabel ?? preview.leagueId,
    sport: preview.sport ?? preview.leagueId,
    ouLean: preview.ouLean ?? "neutral",
    insufficientSample: preview.insufficientSample ?? true,
    sampleGames: finiteNumber(preview.sampleGames),
    scoringLabel: preview.scoringLabel ?? "Points",
    whistleLabel: preview.whistleLabel ?? "Fouls",
    avgTotalPoints: finiteNumber(preview.avgTotalPoints),
    totalPointsDelta: finiteNumber(preview.totalPointsDelta),
    overRate: finiteNumber(preview.overRate, 0.5),
    avgFouls: finiteNumber(preview.avgFouls),
    foulsDelta: finiteNumber(preview.foulsDelta),
    crew,
    refTeamRows,
    teamImpacts,
    storylines,
    matchupBriefing: preview.matchupBriefing
      ? {
          ...preview.matchupBriefing,
          headline:
            preview.matchupBriefing.headline ??
            `${preview.awayAbbr ?? awayTeam} at ${preview.homeAbbr ?? homeTeam} matchup sheet`,
          lines: Array.isArray(preview.matchupBriefing.lines)
            ? preview.matchupBriefing.lines.filter(Boolean)
            : [],
          h2hGames: finiteNumber(preview.matchupBriefing.h2hGames),
          avgTotalPoints: finiteNumber(preview.matchupBriefing.avgTotalPoints),
          avgFouls: finiteNumber(preview.matchupBriefing.avgFouls),
          overRate: finiteNumber(preview.matchupBriefing.overRate, 0.5),
        }
      : undefined,
    intelligenceCard: preview.intelligenceCard?.primarySignalBody
      ? preview.intelligenceCard
      : undefined,
  };
}
