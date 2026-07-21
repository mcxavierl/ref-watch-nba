import { buildProjectionEvidence } from "@/lib/analytics/build-projection-evidence";
import type { EvidenceDriver } from "@/lib/analytics/evidence";
import type { GameSlatePreviewPayload } from "@/lib/game-slate-preview";
import { loadLeagueStats } from "@/lib/load-league-stats";
import type {
  IntelligenceCardContent,
  IntelligenceMetricType,
} from "@/lib/intelligence/intelligence-card-types";
import { formatSigned } from "@/lib/stats-utils";

function crewLastNames(crew: GameSlatePreviewPayload["crew"]): string {
  if (crew.length === 0) return "Crew TBD";
  return crew
    .map((official) => {
      const parts = official.name.trim().split(/\s+/);
      return parts[parts.length - 1] ?? official.name;
    })
    .join(" / ");
}

function crewCitationSlugs(crew: GameSlatePreviewPayload["crew"]): string {
  if (crew.length === 0) return "TBD";
  return crew
    .map((official) => {
      const parts = official.name.trim().split(/\s+/);
      return parts[parts.length - 1] ?? official.name;
    })
    .join("/");
}

function formatCompactCount(value: number): string {
  return value.toLocaleString("en-US");
}

function seasonSpanLabel(seasons: string[]): string {
  if (seasons.length === 0) return "2014–present";
  const years = seasons
    .map((season) => {
      const match = season.match(/(\d{4})/);
      return match ? Number(match[1]) : null;
    })
    .filter((year): year is number => year !== null);
  if (years.length === 0) return "2014–present";
  const earliest = Math.min(...years);
  const latest = Math.max(...years);
  if (earliest === latest) return String(earliest);
  return `${earliest}–${latest === new Date().getFullYear() ? "present" : latest}`;
}

export function buildProofSubtext(preview: GameSlatePreviewPayload): string {
  const { stats } = loadLeagueStats(preview.leagueId);
  const totalGames =
    stats.meta.totalGamesProcessed ??
    stats.refs.reduce((sum, ref) => sum + ref.games, 0);
  const crewCount = stats.meta.refCount ?? stats.refs.length;
  const span = seasonSpanLabel(stats.meta.seasons);

  return `Computed from ${formatCompactCount(totalGames)} historical games | ${formatCompactCount(crewCount)} crews | ${span}`;
}

function whistleAccelerationPct(preview: GameSlatePreviewPayload): number {
  const leagueBaseline = preview.avgFouls - preview.foulsDelta;
  if (!Number.isFinite(leagueBaseline) || Math.abs(leagueBaseline) < 0.01) return 0;
  return Math.round((preview.foulsDelta / leagueBaseline) * 1000) / 10;
}

function primarySignalForPreview(preview: GameSlatePreviewPayload): {
  label: string;
  body: string;
  metricType: IntelligenceMetricType;
  metricDeltaPct: number;
} {
  const whistlePct = whistleAccelerationPct(preview);
  const whistleLabel = preview.whistleLabel.toLowerCase();

  if (Math.abs(preview.foulsDelta) >= 0.4) {
    const environment =
      preview.foulsDelta > 0 ? "HIGH WHISTLE ENVIRONMENT" : "LOW WHISTLE ENVIRONMENT";
    const direction = preview.foulsDelta > 0 ? "above" : "below";
    return {
      label: environment,
      body: `${formatSigned(whistlePct)}% Whistle Acceleration ${direction} league baseline in high-contact situations.`,
      metricType: "Whistle Acceleration",
      metricDeltaPct: whistlePct,
    };
  }

  if (Math.abs(preview.totalPointsDelta) >= 1) {
    const leagueScoringBaseline = preview.avgTotalPoints - preview.totalPointsDelta;
    const scoringPct =
      Math.abs(leagueScoringBaseline) < 0.01
        ? 0
        : Math.round((preview.totalPointsDelta / leagueScoringBaseline) * 1000) / 10;
    const environment =
      preview.totalPointsDelta > 0 ? "ELEVATED SCORING PACE" : "SUPPRESSED SCORING PACE";
    const direction = preview.totalPointsDelta > 0 ? "above" : "below";
    return {
      label: environment,
      body: `${formatSigned(scoringPct)}% Scoring Pace ${direction} league baseline in pace-sensitive game states.`,
      metricType: "Scoring Pace",
      metricDeltaPct: scoringPct,
    };
  }

  return {
    label: "BASELINE CREW PROFILE",
    body: `Crew ${whistleLabel} volume tracks league baseline across shared sample windows.`,
    metricType: "Crew Baseline",
    metricDeltaPct: 0,
  };
}

function humanizeDriver(driver: EvidenceDriver): string {
  const feature = driver.feature.toLowerCase();
  if (feature.includes("restricted") || feature.includes("paint")) {
    return "Restricted-Area Contests";
  }
  if (feature.includes("second") || feature.includes("half")) {
    return "2nd-Half Contact Escalation";
  }
  if (feature.includes("guard") || feature.includes("penetration")) {
    return "Guard Penetration Matchups";
  }
  if (feature.includes("crew")) return "Crew Baseline Tendency";
  if (feature.includes("team")) return "Team Split Pressure";
  if (feature.includes("historical")) return "Historical Matchup Drift";

  const words = driver.headline
    .replace(/[•.:]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");
  return words.length > 0 ? words : "Model Driver";
}

function buildPremiumDriverTeaser(preview: GameSlatePreviewPayload): string {
  const evidence = buildProjectionEvidence(preview);
  const drivers = [...evidence.factorsIncreasing, ...evidence.factorsReducing]
    .sort((a, b) => {
      const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return rank[a.impact] - rank[b.impact];
    })
    .map(humanizeDriver);

  const unique = [...new Set(drivers)].slice(0, 3);
  if (unique.length === 0) {
    return "Restricted-Area Contests • 2nd-Half Contact Escalation • Guard Penetration Matchups";
  }

  while (unique.length < 3) {
    const fallbacks = [
      "Restricted-Area Contests",
      "2nd-Half Contact Escalation",
      "Guard Penetration Matchups",
    ];
    for (const fallback of fallbacks) {
      if (!unique.includes(fallback)) {
        unique.push(fallback);
        break;
      }
    }
    if (unique.length >= 3) break;
  }

  return unique.slice(0, 3).join(" • ");
}

function seasonCountLabel(sampleGames: number, seasons: string[]): string {
  const seasonCount = Math.max(1, Math.min(seasons.length, 3));
  if (seasonCount > 1) return `${seasonCount} seasons`;
  return "recent seasons";
}

export function buildIntelligenceCardContent(
  preview: GameSlatePreviewPayload,
): IntelligenceCardContent {
  const { stats } = loadLeagueStats(preview.leagueId);
  const signal = primarySignalForPreview(preview);
  const sampleGames = preview.sampleGames;

  return {
    gameId: preview.gameId,
    proofSubtext: buildProofSubtext(preview),
    crewPill: crewLastNames(preview.crew),
    crewCitation: crewCitationSlugs(preview.crew),
    primarySignalLabel: signal.label,
    primarySignalBody: signal.body,
    metricType: signal.metricType,
    metricDeltaPct: signal.metricDeltaPct,
    sampleFootnote: `Sample: ${sampleGames} games across ${seasonCountLabel(sampleGames, stats.meta.seasons)}`,
    sampleGames,
    premiumDriverTeaser: buildPremiumDriverTeaser(preview),
  };
}
