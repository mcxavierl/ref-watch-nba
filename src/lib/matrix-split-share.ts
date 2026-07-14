import { matrixCellStyle } from "@/lib/ref-team-matrix";
import type {
  RefTeamMatrixCell,
  RefTeamMatrixRef,
  RefTeamMatrixTeam,
} from "@/lib/ref-team-matrix";
import {
  DEFAULT_SEASON_SCOPE_MODE,
  type SeasonScopeMode,
} from "@/lib/season-scope";
import { formatSigned, formatWinRateVsTeam } from "@/lib/stats-utils";

export type MatrixSplitShareInput = {
  siteUrl: string;
  matrixPath: string;
  scopeMode: SeasonScopeMode;
  leagueLabel: string;
  scopeLabel: string;
  whistleDiffLabel: string;
  ref: RefTeamMatrixRef;
  team: RefTeamMatrixTeam;
  cell: RefTeamMatrixCell;
};

export function buildMatrixSplitPath(
  matrixPath: string,
  refSlug: string,
  teamAbbr: string,
  scopeMode: SeasonScopeMode,
  options?: { refOnly?: boolean },
): string {
  const params = new URLSearchParams();
  if (!options?.refOnly) {
    params.set("ref", refSlug);
  }
  params.set("team", teamAbbr.toUpperCase());
  if (scopeMode !== DEFAULT_SEASON_SCOPE_MODE) {
    params.set("scope", scopeMode);
  }
  const query = params.toString();
  return query ? `${matrixPath}?${query}` : matrixPath;
}

export function buildMatrixSplitShareUrl(input: MatrixSplitShareInput): string {
  const path = buildMatrixSplitPath(
    input.matrixPath,
    input.ref.slug,
    input.team.abbr,
    input.scopeMode,
  );
  return `${input.siteUrl.replace(/\/$/, "")}${path}`;
}

export function buildMatrixSplitShareLinkText(
  input: MatrixSplitShareInput,
): string {
  const url = buildMatrixSplitShareUrl(input);
  return [
    `⚖️ Ref Watch Split: ${input.ref.name} × ${input.team.abbr.toUpperCase()} (${input.scopeLabel})`,
    `🔗 Check out the complete whistle trends and historical game logs: ${url}`,
  ].join("\n");
}

export function buildMatrixTeamShareUrl(
  siteUrl: string,
  matrixPath: string,
  teamAbbr: string,
  scopeMode: SeasonScopeMode,
): string {
  const params = new URLSearchParams();
  params.set("team", teamAbbr.toUpperCase());
  if (scopeMode !== DEFAULT_SEASON_SCOPE_MODE) {
    params.set("scope", scopeMode);
  }
  const path = `${matrixPath}?${params.toString()}`;
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

export function buildMatrixSplitShareText(input: MatrixSplitShareInput): string {
  const { tone, deltaPts } = matrixCellStyle(
    input.cell,
    input.team.baselineWinRate,
  );
  const record = `${input.cell.wins}-${input.cell.losses}`;
  const winDelta = input.cell.thinSample
    ? `${input.cell.games} games (below sample gate)`
    : formatWinRateVsTeam(input.cell.winRate, input.team.baselineWinRate);
  const whistleUnit = input.whistleDiffLabel.replace(/\s+diff$/i, "").toLowerCase();
  const whistle = formatSigned(input.cell.avgFoulDifferential);
  const toneNote =
    tone === "neutral"
      ? "near team baseline"
      : `${Math.abs(deltaPts).toFixed(1)} pts ${tone === "positive" ? "above" : "below"} team baseline`;
  const url = buildMatrixSplitShareUrl(input);

  return [
    `⚖️ Ref Watch Split: ${input.ref.name} × ${input.team.abbr.toUpperCase()} (${input.scopeLabel})`,
    `📊 ${record} in ${input.cell.games} games · ${winDelta} · ${whistle} ${whistleUnit}/game (${toneNote})`,
    `🔗 Check out the complete whistle trends and historical game logs: ${url}`,
    "ℹ️ Historical splits only. Descriptive, not picks.",
  ].join("\n");
}

export function buildMatrixTeamShareLinkText({
  siteUrl,
  matrixPath,
  scopeMode,
  scopeLabel,
  team,
}: {
  siteUrl: string;
  matrixPath: string;
  scopeMode: SeasonScopeMode;
  scopeLabel: string;
  team: RefTeamMatrixTeam;
}): string {
  const url = buildMatrixTeamShareUrl(siteUrl, matrixPath, team.abbr, scopeMode);
  return [
    `⚖️ Ref Watch Team Matrix: ${team.label} (${scopeLabel})`,
    `🔗 Check out the complete whistle trends and historical game logs: ${url}`,
  ].join("\n");
}

export function buildMatrixTeamShareText({
  siteUrl,
  matrixPath,
  scopeMode,
  leagueLabel,
  scopeLabel,
  team,
  officialNounPlural,
}: {
  siteUrl: string;
  matrixPath: string;
  scopeMode: SeasonScopeMode;
  leagueLabel: string;
  scopeLabel: string;
  team: RefTeamMatrixTeam;
  officialNounPlural: string;
}): string {
  const baseline =
    team.baselineGames > 0
      ? `${team.baselineWins}-${team.baselineLosses} team baseline (${team.baselineGames} gp)`
      : "team baseline unavailable";
  const url = buildMatrixTeamShareUrl(siteUrl, matrixPath, team.abbr, scopeMode);
  return [
    `⚖️ Ref Watch Team Matrix: ${team.label} (${scopeLabel})`,
    `📊 ${baseline}. Top and bottom ${officialNounPlural} vs team baseline.`,
    `🔗 Check out the complete whistle trends and historical game logs: ${url}`,
    "ℹ️ Descriptive tendencies only, not picks.",
  ].join("\n");
}
