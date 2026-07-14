import { CFB_TEAM_ABBRS } from "../../../src/lib/cfb/teams";
import type { CfbConferenceConfig } from "./leagues-config";
import {
  getCfbTeamAbbrsForConference,
  resolveCfbConferencesToProcess,
  shouldIngestCfbGame,
} from "./leagues-config";
import { CFB_ESPN_TEAM_IDS } from "./team-ids";
import {
  fetchCfbSummary,
  fetchTeamSchedule,
  inferCfbSeasonFromEspnYear,
  sleep,
} from "./espn";
import { validateCfbGameSummaryContract } from "./contract";
import { appendCfbIngestError } from "./ingest-errors";
import {
  loadExtractedGames,
  saveExtractedGames,
  upsertExtractedGame,
  type CfbExtractedGameRecord,
} from "./upsert";

/** ESPN season year: 2024 → 2024-25 */
export const CFB_ESPN_YEARS = [2020, 2021, 2022, 2023, 2024, 2025] as const;

export interface CfbExtractSummary {
  scheduleEvents: number;
  fetched: number;
  upserted: number;
  updated: number;
  contractFailures: number;
  skippedNonLiveConference: number;
  fetchErrors: number;
  conferencesProcessed: string[];
  conferencesFailed: string[];
}

export interface CfbExtractOptions {
  leagueSlug?: string;
}

function emptySummary(): CfbExtractSummary {
  return {
    scheduleEvents: 0,
    fetched: 0,
    upserted: 0,
    updated: 0,
    contractFailures: 0,
    skippedNonLiveConference: 0,
    fetchErrors: 0,
    conferencesProcessed: [],
    conferencesFailed: [],
  };
}

function mergeSummary(target: CfbExtractSummary, source: CfbExtractSummary): void {
  target.scheduleEvents += source.scheduleEvents;
  target.fetched += source.fetched;
  target.upserted += source.upserted;
  target.updated += source.updated;
  target.contractFailures += source.contractFailures;
  target.skippedNonLiveConference += source.skippedNonLiveConference;
  target.fetchErrors += source.fetchErrors;
  target.conferencesProcessed.push(...source.conferencesProcessed);
  target.conferencesFailed.push(...source.conferencesFailed);
}

async function collectScheduleEventsForTeams(
  teamAbbrs: string[],
  conferenceLabel: string,
): Promise<Map<string, { season: string; awayAbbr: string; homeAbbr: string }>> {
  const byId = new Map<
    string,
    { season: string; awayAbbr: string; homeAbbr: string }
  >();
  const teamSet = new Set(teamAbbrs);

  for (const espnYear of CFB_ESPN_YEARS) {
    const label = inferCfbSeasonFromEspnYear(espnYear);
    console.log(`  [${conferenceLabel}] Collecting ${label} schedules...`);
    for (const abbr of teamAbbrs) {
      const teamId = CFB_ESPN_TEAM_IDS[abbr];
      if (!teamId) {
        console.warn(`    missing ESPN id for ${abbr}`);
        continue;
      }
      for (const seasonType of [2, 3] as const) {
        await sleep(60);
        let events;
        try {
          events = await fetchTeamSchedule(teamId, espnYear, seasonType);
        } catch (err) {
          appendCfbIngestError({
            phase: "extract",
            message: `Schedule fetch failed for ${abbr} ${label} t${seasonType} (${conferenceLabel})`,
            details: String(err),
          });
          console.warn(`    ${abbr} ${label} t${seasonType}: ${err}`);
          continue;
        }
        for (const ev of events) {
          if (!teamSet.has(ev.awayAbbr) && !teamSet.has(ev.homeAbbr)) continue;
          if (!byId.has(ev.eventId)) {
            byId.set(ev.eventId, {
              season: ev.season,
              awayAbbr: ev.awayAbbr,
              homeAbbr: ev.homeAbbr,
            });
          }
        }
      }
    }
    console.log(`    ${label}: ${byId.size} unique ${conferenceLabel} games so far`);
  }

  return byId;
}

function summaryToRecord(
  summary: NonNullable<Awaited<ReturnType<typeof fetchCfbSummary>>>,
): CfbExtractedGameRecord {
  const contract = validateCfbGameSummaryContract(summary);
  return {
    gameId: summary.gameId,
    extractedAt: new Date().toISOString(),
    season: summary.season,
    awayAbbr: summary.awayAbbr,
    homeAbbr: summary.homeAbbr,
    date: summary.date,
    awayScore: summary.awayScore,
    homeScore: summary.homeScore,
    homeFlags: summary.homeFlags,
    awayFlags: summary.awayFlags,
    homePenaltyYards: summary.homePenaltyYards,
    awayPenaltyYards: summary.awayPenaltyYards,
    closingTotal: summary.closingTotal,
    homeSpread: summary.homeSpread,
    lineSource: summary.lineSource,
    status: summary.status,
    officials: summary.officials,
    contractValid: contract.valid,
    contractViolations: contract.valid ? undefined : contract.violations,
  };
}

async function extractCfbConference(
  conference: CfbConferenceConfig,
  options: CfbExtractOptions,
): Promise<CfbExtractSummary> {
  const summary = emptySummary();
  summary.conferencesProcessed.push(conference.slug);

  const teamAbbrs = getCfbTeamAbbrsForConference(conference.name);
  if (teamAbbrs.length === 0) {
    throw new Error(`No tracked teams for conference ${conference.name}`);
  }

  const schedule = await collectScheduleEventsForTeams(
    teamAbbrs,
    conference.name,
  );
  summary.scheduleEvents = schedule.size;
  console.log(`  Fetching ${schedule.size} ${conference.name} game summaries...`);

  const file = loadExtractedGames();

  for (const [eventId, meta] of schedule) {
    const trackedHome = CFB_TEAM_ABBRS.includes(meta.homeAbbr);
    const trackedAway = CFB_TEAM_ABBRS.includes(meta.awayAbbr);
    if (!trackedHome && !trackedAway) continue;

    if (!shouldIngestCfbGame(meta.homeAbbr, meta.awayAbbr, options.leagueSlug)) {
      summary.skippedNonLiveConference++;
      continue;
    }

    await sleep(75);
    let gameSummary;
    try {
      gameSummary = await fetchCfbSummary(eventId, meta.season);
    } catch (err) {
      summary.fetchErrors++;
      appendCfbIngestError({
        phase: "extract",
        gameId: eventId,
        message: `Summary fetch failed (${conference.slug})`,
        details: String(err),
      });
      if (summary.fetchErrors <= 5) {
        console.warn(`    Summary ${eventId}: ${err}`);
      }
      continue;
    }

    if (!gameSummary) continue;
    summary.fetched++;

    const contract = validateCfbGameSummaryContract(gameSummary);
    if (!contract.valid) {
      summary.contractFailures++;
      appendCfbIngestError({
        phase: "contract",
        gameId: eventId,
        message: `Game summary failed contract validation (${conference.slug})`,
        details: contract.violations,
      });
    }

    const record = summaryToRecord(gameSummary);
    const isNew = upsertExtractedGame(file, record);
    if (isNew) summary.upserted++;
    else summary.updated++;

    if (summary.fetched % 100 === 0) {
      console.log(
        `    fetched ${summary.fetched} ${conference.slug} summaries ` +
          `(${summary.upserted} new, ${summary.updated} updated)...`,
      );
    }
  }

  saveExtractedGames(file);
  return summary;
}

export async function extractCfbGamesFromEspn(
  options: CfbExtractOptions = {},
): Promise<CfbExtractSummary> {
  const conferences = resolveCfbConferencesToProcess(options.leagueSlug);
  const aggregate = emptySummary();

  console.log(
    `CFB extract: ${conferences.length} conference(s) — ` +
      conferences.map((conf) => conf.slug).join(", "),
  );

  for (const conference of conferences) {
    console.log(`\n=== ${conference.name} (${conference.slug}) ===`);
    try {
      const result = await extractCfbConference(conference, options);
      mergeSummary(aggregate, result);
      console.log(
        `  ${conference.slug} complete: ${result.fetched} summaries ` +
          `(${result.upserted} new, ${result.updated} updated)`,
      );
    } catch (err) {
      const message = `Conference ingest failed for ${conference.slug}: ${err}`;
      console.error(`  ${message}`);
      appendCfbIngestError({
        phase: "extract",
        message,
        details: String(err),
      });
      aggregate.conferencesFailed.push(conference.slug);
    }
  }

  return aggregate;
}
