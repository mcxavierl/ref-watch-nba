import { CFB_TEAM_ABBRS } from "../../../src/lib/cfb/teams";
import { shouldIngestNcaaGame } from "../../../src/lib/ncaa-conference-gate";
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
}

async function collectScheduleEvents(): Promise<
  Map<string, { season: string; awayAbbr: string; homeAbbr: string }>
> {
  const byId = new Map<
    string,
    { season: string; awayAbbr: string; homeAbbr: string }
  >();

  for (const espnYear of CFB_ESPN_YEARS) {
    const label = inferCfbSeasonFromEspnYear(espnYear);
    console.log(`Collecting ${label} schedules...`);
    for (const abbr of CFB_TEAM_ABBRS) {
      const teamId = CFB_ESPN_TEAM_IDS[abbr];
      if (!teamId) {
        console.warn(`  missing ESPN id for ${abbr}`);
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
            message: `Schedule fetch failed for ${abbr} ${label} t${seasonType}`,
            details: String(err),
          });
          console.warn(`  ${abbr} ${label} t${seasonType}: ${err}`);
          continue;
        }
        for (const ev of events) {
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
    console.log(`  ${label}: ${byId.size} unique tracked games so far`);
  }

  return byId;
}

function summaryToRecord(summary: NonNullable<Awaited<ReturnType<typeof fetchCfbSummary>>>): CfbExtractedGameRecord {
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

export async function extractCfbGamesFromEspn(): Promise<CfbExtractSummary> {
  const schedule = await collectScheduleEvents();
  console.log(`\nFetching ${schedule.size} game summaries...`);

  const file = loadExtractedGames();
  let fetched = 0;
  let upserted = 0;
  let updated = 0;
  let contractFailures = 0;
  let skippedNonLiveConference = 0;
  let fetchErrors = 0;

  for (const [eventId, meta] of schedule) {
    const trackedHome = CFB_TEAM_ABBRS.includes(meta.homeAbbr);
    const trackedAway = CFB_TEAM_ABBRS.includes(meta.awayAbbr);
    if (!trackedHome && !trackedAway) continue;

    if (!shouldIngestNcaaGame("cfb", meta.homeAbbr, meta.awayAbbr)) {
      skippedNonLiveConference++;
      continue;
    }

    await sleep(75);
    let summary;
    try {
      summary = await fetchCfbSummary(eventId, meta.season);
    } catch (err) {
      fetchErrors++;
      appendCfbIngestError({
        phase: "extract",
        gameId: eventId,
        message: "Summary fetch failed",
        details: String(err),
      });
      if (fetchErrors <= 5) console.warn(`Summary ${eventId}: ${err}`);
      continue;
    }

    if (!summary) continue;
    fetched++;

    const contract = validateCfbGameSummaryContract(summary);
    if (!contract.valid) {
      contractFailures++;
      appendCfbIngestError({
        phase: "contract",
        gameId: eventId,
        message: "Game summary failed contract validation",
        details: contract.violations,
      });
    }

    const record = summaryToRecord(summary);
    const isNew = upsertExtractedGame(file, record);
    if (isNew) upserted++;
    else updated++;

    if (fetched % 100 === 0) {
      console.log(`  fetched ${fetched} summaries (${upserted} new, ${updated} updated)...`);
    }
  }

  saveExtractedGames(file);

  return {
    scheduleEvents: schedule.size,
    fetched,
    upserted,
    updated,
    contractFailures,
    skippedNonLiveConference,
    fetchErrors,
  };
}
