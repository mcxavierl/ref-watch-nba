import type { AssignmentGame, RefStatsFile } from "@/lib/types";
import { resolveSlateGames } from "@/lib/grudge-match";
import { computeSlateHomeBias } from "@/lib/home-bias";
import { getOdds } from "@/lib/odds";
import {
  computeSlatePremiums,
  paceAlerts,
} from "@/lib/whistle-premium";
import { formatSigned } from "@/lib/stats-utils";
import type { AssignmentsFile, SlateAlertsFile } from "@/lib/types";

export function computeSlateAlerts(
  assignments: AssignmentsFile,
  stats: RefStatsFile,
): SlateAlertsFile {
  const odds = getOdds();
  const { games, isPreview } = resolveSlateGames(assignments);
  const premiums = computeSlatePremiums(games, stats, odds);

  return {
    generatedAt: new Date().toISOString(),
    assignmentsDate: assignments.date,
    isPreview,
    paceAlerts: paceAlerts(premiums),
    homeBiasSignals: computeSlateHomeBias(games, stats),
  };
}

export function alertsSummary(alerts: SlateAlertsFile): string[] {
  const lines: string[] = [];
  lines.push(
    `Ref Watch slate alerts — ${alerts.assignmentsDate}${alerts.isPreview ? " (preview)" : ""}`,
  );
  lines.push("");

  if (alerts.paceAlerts.length === 0) {
    lines.push("No high-signal pace alerts (sample or threshold filters).");
  } else {
    lines.push("Pace alerts:");
    for (const alert of alerts.paceAlerts) {
      lines.push(
        `• ${alert.matchup}: ${alert.alert === "high_pace" ? "HIGH PACE" : "LOW PACE"} crew (premium ${formatSigned(alert.scoringPremium)}, gap vs line ${formatSigned(alert.gapVsBenchmark)})`,
      );
    }
  }

  lines.push("");
  if (alerts.homeBiasSignals.length === 0) {
    lines.push("No notable home/road bias signals.");
  } else {
    lines.push("Home bias signals:");
    for (const signal of alerts.homeBiasSignals) {
      lines.push(`• ${signal.headline}`);
    }
  }

  lines.push("");
  lines.push(
    "Informational only — historical patterns, not betting advice.",
  );

  return lines;
}

export type { AssignmentGame };
