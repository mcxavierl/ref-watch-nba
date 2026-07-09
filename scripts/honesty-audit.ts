#!/usr/bin/env npx tsx
/**
 * Offline honesty audit — verifies provenance tags match data reality.
 * Writes HONESTY-AUDIT.md with per-league metric counts and violation flags.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { baselineUsingFallback } from "../src/lib/baselines";
import {
  crewMetricsProvenance,
  enrichBettingStats,
  isEstimatedTag,
  nhlCrewMetricsProvenance,
  nhlRefAnalyticsProvenance,
  refProfileCoreProvenance,
  summarizeProvenance,
} from "../src/lib/provenance";
import type {
  MetricProvenance,
  ProvenanceTag,
  RefProfile,
  RefStatsFile,
} from "../src/lib/types";

interface AuditIssue {
  league: "NBA" | "NHL" | "NFL" | "CBB" | "CFB" | "EPL";
  context: string;
  metric: string;
  tag: ProvenanceTag;
  issue: string;
}

interface LeagueAudit {
  league: "NBA" | "NHL" | "NFL" | "CBB" | "CFB" | "EPL";
  dataSource: RefStatsFile["meta"]["source"];
  refCount: number;
  baselineFallback: boolean;
  metricCounts: ReturnType<typeof summarizeProvenance>;
  issues: AuditIssue[];
  belowGateRefs: number;
  estimatedOverRates: number;
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function pushTag(tags: ProvenanceTag[], prov?: MetricProvenance): void {
  if (prov) tags.push(prov.tag);
}

function checkMetric(
  issues: AuditIssue[],
  league: "NBA" | "NHL",
  context: string,
  metric: string,
  prov: MetricProvenance | undefined,
  opts?: { requireEstimatedOnFallback?: boolean; gateCleared?: boolean },
): void {
  if (!prov) return;

  if (opts?.requireEstimatedOnFallback && !isEstimatedTag(prov.tag)) {
    issues.push({
      league,
      context,
      metric,
      tag: prov.tag,
      issue: "Fallback baseline active but metric not marked estimated",
    });
  }

  if (opts?.gateCleared === false && prov.tag === "computed-from-real") {
    issues.push({
      league,
      context,
      metric,
      tag: prov.tag,
      issue: "Below sample gate but tagged as real",
    });
  }
}

function auditRefProfile(
  league: "NBA" | "NHL",
  profile: RefProfile,
  stats: RefStatsFile,
  tags: ProvenanceTag[],
  issues: AuditIssue[],
  counters: { belowGateRefs: number; estimatedOverRates: number },
): void {
  const ctx = `ref:${profile.slug}`;
  const core = refProfileCoreProvenance(profile, stats.meta);
  const gateCleared = core.sampleGate.cleared;
  if (!gateCleared) counters.belowGateRefs++;

  const fallback = baselineUsingFallback(league);

  pushTag(tags, core.avgTotalPoints);
  pushTag(tags, core.avgFouls);
  pushTag(tags, core.overRate);
  pushTag(tags, core.leagueBaseline);

  checkMetric(issues, league, ctx, "avgTotalPoints", core.avgTotalPoints, {
    gateCleared,
  });
  checkMetric(issues, league, ctx, "avgFouls", core.avgFouls, { gateCleared });
  checkMetric(issues, league, ctx, "overRate", core.overRate, {
    requireEstimatedOnFallback: fallback,
    gateCleared,
  });
  if (isEstimatedTag(core.overRate.tag)) counters.estimatedOverRates++;

  const betting = enrichBettingStats(profile, stats.meta);
  if (betting?.provenance) {
    const bp = betting.provenance;
    pushTag(tags, bp.aggregate);
    pushTag(tags, bp.homeTeamAts);
    pushTag(tags, bp.overUnder);
    pushTag(tags, bp.spreadBuckets);
    pushTag(tags, bp.lines);

    if (!betting.linesAvailable && bp.homeTeamAts.tag === "computed-from-real") {
      issues.push({
        league,
        context: ctx,
        metric: "homeTeamAts",
        tag: bp.homeTeamAts.tag,
        issue: "No closing lines but ATS tagged as real",
      });
    }

    const bucketGate = bp.bucketGateThreshold;
    for (const bucket of betting.overUnder.buckets) {
      const games =
        bucket.record.wins + bucket.record.losses + bucket.record.pushes;
      if (
        games < bucketGate &&
        games > 0 &&
        bp.overUnder.tag === "computed-from-real"
      ) {
        issues.push({
          league,
          context: ctx,
          metric: `ou-bucket:${bucket.label}`,
          tag: bp.overUnder.tag,
          issue: `O/U bucket ${games}/${bucketGate} games — below gate`,
        });
      }
    }
  }

  if (profile.nhlAnalytics && league === "NHL") {
    const analytics = nhlRefAnalyticsProvenance(
      profile,
      profile.nhlAnalytics,
      stats.meta,
    );
    pushTag(tags, analytics.avgMinorsPerGame);
    pushTag(tags, analytics.overtimeRate);
    pushTag(tags, analytics.penaltyBalance);
    pushTag(tags, analytics.minorsBaseline);

    checkMetric(
      issues,
      league,
      ctx,
      "avgMinorsPerGame",
      analytics.avgMinorsPerGame,
      { gateCleared: analytics.sampleGate.cleared },
    );
  }
}

function auditSlateCrews(
  league: "NBA" | "NHL",
  stats: RefStatsFile,
  tags: ProvenanceTag[],
  issues: AuditIssue[],
): void {
  const assignmentsDir =
    league === "NBA"
      ? path.join(process.cwd(), "data", "assignments.json")
      : path.join(process.cwd(), "data", "nhl", "assignments.json");
  const assignments = readJson<{ games: { crew: { name: string; number: number }[] }[] }>(
    assignmentsDir,
  );
  if (!assignments?.games?.length) return;

  const minSample = stats.meta.minSampleSize;
  const fallback = baselineUsingFallback(league);

  for (const game of assignments.games.slice(0, 20)) {
    let qualified = 0;
    let poolGames = 0;
    for (const official of game.crew) {
      const slug = official.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const profile = stats.refs.find(
        (r) =>
          r.slug.includes(String(official.number)) ||
          r.name === official.name,
      );
      if (profile && profile.games >= minSample) {
        qualified++;
        poolGames += profile.games;
      }
    }
    const avgSample = Math.round(poolGames / (qualified || 1));
    const prov =
      league === "NBA"
        ? crewMetricsProvenance(stats, qualified, avgSample, minSample)
        : nhlCrewMetricsProvenance(stats, qualified, avgSample);

    pushTag(tags, prov.aggregate);
    pushTag(tags, prov.scoring);
    pushTag(tags, prov.fouls);
    pushTag(tags, prov.overRate);

    checkMetric(issues, league, "slate-crew", "overRate", prov.overRate, {
      requireEstimatedOnFallback: fallback,
      gateCleared: prov.sampleGate.cleared,
    });
  }
}

function auditLeague(league: "NBA" | "NHL"): LeagueAudit {
  const statsPath =
    league === "NBA"
      ? path.join(process.cwd(), "data", "ref-stats.json")
      : path.join(process.cwd(), "data", "nhl", "ref-stats.json");

  const stats = readJson<RefStatsFile>(statsPath);
  if (!stats) {
    return {
      league,
      dataSource: "seeded",
      refCount: 0,
      baselineFallback: baselineUsingFallback(league),
      metricCounts: { real: 0, partial: 0, estimated: 0, total: 0 },
      issues: [
        {
          league,
          context: "data",
          metric: "ref-stats.json",
          tag: "fallback-constant",
          issue: "Ref stats file missing",
        },
      ],
      belowGateRefs: 0,
      estimatedOverRates: 0,
    };
  }

  const tags: ProvenanceTag[] = [];
  const issues: AuditIssue[] = [];
  const counters = { belowGateRefs: 0, estimatedOverRates: 0 };

  for (const profile of stats.refs) {
    auditRefProfile(league, profile, stats, tags, issues, counters);
  }

  auditSlateCrews(league, stats, tags, issues);

  if (stats.meta.source === "seeded") {
    const note = stats.meta.note?.toLowerCase() ?? "";
    if (note.includes("no ref stats") || note.includes("no data")) {
      issues.push({
        league,
        context: "meta",
        metric: "dataset",
        tag: "fallback-constant",
        issue: "Seeded placeholder with no ref stats on file",
      });
    }
  }

  return {
    league,
    dataSource: stats.meta.source,
    refCount: stats.refs.length,
    baselineFallback: baselineUsingFallback(league),
    metricCounts: summarizeProvenance(tags),
    issues,
    belowGateRefs: counters.belowGateRefs,
    estimatedOverRates: counters.estimatedOverRates,
  };
}

function auditSeededOrLiveLeague(
  league: "NFL" | "CBB" | "CFB" | "EPL",
): LeagueAudit {
  const dir = league.toLowerCase();
  const statsPath = path.join(process.cwd(), "data", dir, "ref-stats.json");
  const stats = readJson<RefStatsFile>(statsPath);
  const issues: AuditIssue[] = [];

  if (!stats) {
    return {
      league,
      dataSource: "seeded",
      refCount: 0,
      baselineFallback: baselineUsingFallback(league),
      metricCounts: { real: 0, partial: 0, estimated: 0, total: 0 },
      issues: [
        {
          league,
          context: "data",
          metric: "ref-stats.json",
          tag: "fallback-constant",
          issue: "Ref stats file missing",
        },
      ],
      belowGateRefs: 0,
      estimatedOverRates: 0,
    };
  }

  const assignmentsPath = path.join(process.cwd(), "data", dir, "assignments.json");
  const assignments = readJson<{ games: unknown[]; source?: string }>(assignmentsPath);
  const slateEmpty = !assignments?.games?.length;

  if (stats.meta.source === "seeded" && stats.refs.some((r) => r.games > 0)) {
    issues.push({
      league,
      context: "meta",
      metric: "source",
      tag: "computed-from-real",
      issue: "Seeded source but refs report game counts — verify provenance",
    });
  }

  if (league === "NFL") {
    const nflVerified =
      stats.meta.source === "espn" || stats.meta.source === "hybrid";
    if (!nflVerified) {
      issues.push({
        league,
        context: "meta",
        metric: "source",
        tag: "fallback-constant",
        issue: `Expected espn or hybrid source, got ${stats.meta.source}`,
      });
    }
    if (stats.meta.atsAvailable && !nflVerified) {
      issues.push({
        league,
        context: "meta",
        metric: "atsAvailable",
        tag: "computed-from-real",
        issue: "NFL ATS flagged available but no verified closing lines",
      });
    }
    if (!nflVerified) {
      for (const ref of stats.refs) {
        if (ref.bettingStats?.linesAvailable) {
          issues.push({
            league,
            context: `ref:${ref.slug}`,
            metric: "bettingStats.linesAvailable",
            tag: "computed-from-real",
            issue: "NFL ref shows betting lines but league has no closing lines",
          });
        }
      }
    }
  }

  if (stats.meta.source === "seeded" && !slateEmpty) {
    issues.push({
      league,
      context: "assignments",
      metric: "slate",
      tag: "computed-from-real",
      issue: "Seeded stats but assignments file has games — source mismatch",
    });
  }

  if (
    stats.meta.source === "seeded" &&
    slateEmpty &&
    stats.refs.length === 0 &&
    league === "NFL"
  ) {
    issues.push({
      league,
      context: "meta",
      metric: "refs",
      tag: "fallback-constant",
      issue: "NFL offseason with empty ref roster",
    });
  }

  return {
    league,
    dataSource: stats.meta.source,
    refCount: stats.refs.length,
    baselineFallback: baselineUsingFallback(league),
    metricCounts: {
      real:
        stats.meta.source === "espn" || stats.meta.source === "hybrid"
          ? stats.refs.length
          : 0,
      partial: stats.meta.source === "seeded" ? stats.refs.length : 0,
      estimated: 0,
      total: stats.refs.length,
    },
    issues,
    belowGateRefs: 0,
    estimatedOverRates: 0,
  };
}

function formatExtendedSection(audit: LeagueAudit): string[] {
  const lines = [
    `## ${audit.league}`,
    "",
    `- Data source: **${audit.dataSource}**`,
    `- Ref profiles: **${audit.refCount}**`,
    `- League baseline fallback: **${audit.baselineFallback ? "yes" : "no"}**`,
    `- Displayed metrics: **${audit.metricCounts.real}** real · **${audit.metricCounts.partial}** partial · **${audit.metricCounts.estimated}** estimated (${audit.metricCounts.total} total)`,
    "",
  ];
  if (audit.issues.length === 0) {
    lines.push("No honesty violations flagged.", "");
  } else {
    lines.push(`### Violations (${audit.issues.length})`, "");
    for (const issue of audit.issues.slice(0, 20)) {
      lines.push(
        `- **${issue.context}** · ${issue.metric}: ${issue.issue} (tag: \`${issue.tag}\`)`,
      );
    }
    if (audit.issues.length > 20) {
      lines.push(`- …and ${audit.issues.length - 20} more`);
    }
    lines.push("");
  }
  return lines;
}

function formatReport(
  nba: LeagueAudit,
  nhl: LeagueAudit,
  nfl: LeagueAudit,
  cbb: LeagueAudit,
  cfb: LeagueAudit,
  epl: LeagueAudit,
): string {
  const lines: string[] = [
    "# Honesty audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Counts reflect provenance tags that would be shown in the UI (ref profiles, betting splits, slate crew metrics).",
    "",
    "## NBA",
    "",
    `- Data source: **${nba.dataSource}**`,
    `- Ref profiles: **${nba.refCount}**`,
    `- League baseline fallback: **${nba.baselineFallback ? "yes" : "no"}**`,
    `- Displayed metrics: **${nba.metricCounts.real}** real · **${nba.metricCounts.partial}** partial · **${nba.metricCounts.estimated}** estimated (${nba.metricCounts.total} total)`,
    `- Refs below sample gate: **${nba.belowGateRefs}**`,
    `- Over-rate metrics marked estimated/partial: **${nba.estimatedOverRates}** / ${nba.refCount}`,
    "",
  ];

  if (nba.issues.length === 0) {
    lines.push("No honesty violations flagged.");
  } else {
    lines.push(`### Violations (${nba.issues.length})`, "");
    for (const issue of nba.issues.slice(0, 30)) {
      lines.push(
        `- **${issue.context}** · ${issue.metric}: ${issue.issue} (tag: \`${issue.tag}\`)`,
      );
    }
    if (nba.issues.length > 30) {
      lines.push(`- …and ${nba.issues.length - 30} more`);
    }
  }

  lines.push(
    "",
    "## NHL",
    "",
    `- Data source: **${nhl.dataSource}**`,
    `- Ref profiles: **${nhl.refCount}**`,
    `- League baseline fallback: **${nhl.baselineFallback ? "yes" : "no"}**`,
    `- Displayed metrics: **${nhl.metricCounts.real}** real · **${nhl.metricCounts.partial}** partial · **${nhl.metricCounts.estimated}** estimated (${nhl.metricCounts.total} total)`,
    `- Refs below sample gate: **${nhl.belowGateRefs}**`,
    `- Over-rate metrics marked estimated/partial: **${nhl.estimatedOverRates}** / ${nhl.refCount}`,
    "",
  );

  if (nhl.issues.length === 0) {
    lines.push("No honesty violations flagged.");
  } else {
    lines.push(`### Violations (${nhl.issues.length})`, "");
    for (const issue of nhl.issues.slice(0, 30)) {
      lines.push(
        `- **${issue.context}** · ${issue.metric}: ${issue.issue} (tag: \`${issue.tag}\`)`,
      );
    }
    if (nhl.issues.length > 30) {
      lines.push(`- …and ${nhl.issues.length - 30} more`);
    }
  }

  lines.push(...formatExtendedSection(nfl));
  lines.push(...formatExtendedSection(cbb));
  lines.push(...formatExtendedSection(cfb));
  lines.push(...formatExtendedSection(epl));

  lines.push(
    "",
    "## Summary",
    "",
    "| League | Real | Partial | Estimated | Total | Issues |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    `| NBA | ${nba.metricCounts.real} | ${nba.metricCounts.partial} | ${nba.metricCounts.estimated} | ${nba.metricCounts.total} | ${nba.issues.length} |`,
    `| NHL | ${nhl.metricCounts.real} | ${nhl.metricCounts.partial} | ${nhl.metricCounts.estimated} | ${nhl.metricCounts.total} | ${nhl.issues.length} |`,
    `| NFL | ${nfl.metricCounts.real} | ${nfl.metricCounts.partial} | ${nfl.metricCounts.estimated} | ${nfl.metricCounts.total} | ${nfl.issues.length} |`,
    `| CBB | ${cbb.metricCounts.real} | ${cbb.metricCounts.partial} | ${cbb.metricCounts.estimated} | ${cbb.metricCounts.total} | ${cbb.issues.length} |`,
    `| CFB | ${cfb.metricCounts.real} | ${cfb.metricCounts.partial} | ${cfb.metricCounts.estimated} | ${cfb.metricCounts.total} | ${cfb.issues.length} |`,
    `| EPL | ${epl.metricCounts.real} | ${epl.metricCounts.partial} | ${epl.metricCounts.estimated} | ${epl.metricCounts.total} | ${epl.issues.length} |`,
    "",
    "Re-run after data rebuilds: `npm run honesty-audit`",
    "NFL ESPN cross-check: `node scripts/validate-nfl-accuracy.js`",
    "",
  );

  return lines.join("\n");
}

function main(): void {
  const nba = auditLeague("NBA");
  const nhl = auditLeague("NHL");
  const nfl = auditSeededOrLiveLeague("NFL");
  const cbb = auditSeededOrLiveLeague("CBB");
  const cfb = auditSeededOrLiveLeague("CFB");
  const epl = auditSeededOrLiveLeague("EPL");
  const report = formatReport(nba, nhl, nfl, cbb, cfb, epl);
  const outPath = path.join(process.cwd(), "HONESTY-AUDIT.md");
  fs.writeFileSync(outPath, report, "utf8");

  const totalIssues =
    nba.issues.length +
    nhl.issues.length +
    nfl.issues.length +
    cbb.issues.length +
    cfb.issues.length +
    epl.issues.length;

  console.log("Honesty audit complete");
  console.log(
    `NBA: ${nba.metricCounts.real} real / ${nba.metricCounts.partial} partial (${nba.issues.length} issues)`,
  );
  console.log(
    `NHL: ${nhl.metricCounts.real} real / ${nhl.metricCounts.partial} partial (${nhl.issues.length} issues)`,
  );
  console.log(
    `NFL: ${nfl.metricCounts.real} real / ${nfl.metricCounts.partial} partial (${nfl.issues.length} issues)`,
  );
  console.log(
    `CBB: ${cbb.refCount} refs (${cbb.issues.length} issues) | CFB: ${cfb.refCount} refs (${cfb.issues.length} issues) | EPL: ${epl.refCount} refs (${epl.issues.length} issues)`,
  );
  console.log(`Wrote ${outPath}`);

  if (totalIssues > 0) {
    process.exitCode = 1;
  }
}

main();
