#!/usr/bin/env node
/**
 * MLB build scaffold — plate-umpire-centric fetch loop with honest fallbacks.
 * Usage: node scripts/build-mlb-scaffold.js [--date=YYYY-MM-DD] [--dry-run]
 *
 * Outputs blueprint JSON under data/mlb/ without claiming unverified metrics.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "mlb");

const MLB_SCHEDULE_URL =
  "https://statsapi.mlb.com/api/v1/schedule?sportId=1&hydrate=officials,linescore";

function parseArgs() {
  const dateArg = process.argv.find((a) => a.startsWith("--date="));
  const dryRun = process.argv.includes("--dry-run");
  const date =
    dateArg?.split("=")[1] ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  return { date, dryRun };
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapUmpireRole(officialType) {
  const t = String(officialType ?? "").toLowerCase();
  if (t.includes("home")) return "home_plate";
  if (t.includes("first")) return "first_base";
  if (t.includes("second")) return "second_base";
  if (t.includes("third")) return "third_base";
  return "home_plate";
}

async function fetchSchedule(date) {
  const url = `${MLB_SCHEDULE_URL}&date=${date}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB schedule ${date}: HTTP ${res.status}`);
  return res.json();
}

/**
 * Mock Statcast verification — returns null when pitch data unavailable.
 * Replace with Baseball Savant / Statcast search in Phase 2.
 */
async function fetchStatcastPitchMetrics(_umpireId, _gamePk) {
  return null;
}

/**
 * Mock run-line feed — returns null until verified sportsbook lines wired.
 */
async function fetchVerifiedRunLine(_gamePk) {
  return null;
}

function buildOfficials(game) {
  return (game.officials ?? []).map((row) => {
    const off = row.official ?? {};
    return {
      id: String(off.id ?? off.fullName ?? "unknown"),
      fullName: off.fullName ?? "Unknown",
      role: mapUmpireRole(row.officialType),
    };
  });
}

function findHomePlateUmpire(crew) {
  return (
    crew.find((o) => o.role === "home_plate") ??
    crew[0] ?? { id: "unknown", fullName: "Unknown", role: "home_plate" }
  );
}

async function buildGameRow(game) {
  const crew = buildOfficials(game);
  const hp = findHomePlateUmpire(crew);
  const home = game.teams?.home?.team?.abbreviation ?? "???";
  const away = game.teams?.away?.team?.abbreviation ?? "???";
  const linescore = game.linescore?.teams ?? {};
  const homeScore = linescore.home?.runs ?? 0;
  const awayScore = linescore.away?.runs ?? 0;

  const pitchTracking = await fetchStatcastPitchMetrics(hp.id, game.gamePk);
  const runLine = await fetchVerifiedRunLine(game.gamePk);

  const row = {
    gamePk: String(game.gamePk),
    date: game.gameDate?.slice(0, 10) ?? "",
    season: String(game.season ?? ""),
    homeTeam: home,
    awayTeam: away,
    homeScore,
    awayScore,
    totalRuns: homeScore + awayScore,
    homePlateUmpireId: hp.id,
    homePlateUmpireName: hp.fullName,
    crew,
    pitchTracking: pitchTracking ?? undefined,
    _modules: {
      pitchTrackingAvailable: Boolean(pitchTracking),
      runLineAvailable: Boolean(runLine),
    },
  };

  return sanitizeGameRow(row);
}

/** Strip unverified modules from a single game row. */
function sanitizeGameRow(row) {
  const out = { ...row };
  if (!out._modules?.pitchTrackingAvailable) {
    delete out.pitchTracking;
  }
  delete out._modules;
  return out;
}

function upsertUmpireProfile(profiles, gameRow) {
  const hpId = gameRow.homePlateUmpireId;
  const key = hpId;
  const existing =
    profiles.get(key) ??
    {
      id: hpId,
      slug: `${slugify(gameRow.homePlateUmpireName)}-${hpId}`,
      fullName: gameRow.homePlateUmpireName,
      games: 0,
      seasons: [],
      homePlateUmpireId: hpId,
      teamStats: {},
      pitchTracking: undefined,
      runImpact: undefined,
    };

  existing.games += 1;
  if (gameRow.season && !existing.seasons.includes(gameRow.season)) {
    existing.seasons.push(gameRow.season);
  }

  for (const [teamAbbr, isHome] of [
    [gameRow.homeTeam, true],
    [gameRow.awayTeam, false],
  ]) {
    const won = isHome
      ? gameRow.homeScore > gameRow.awayScore
      : gameRow.awayScore > gameRow.homeScore;
    const row =
      existing.teamStats[teamAbbr] ??
      {
        teamAbbr,
        games: 0,
        wins: 0,
        losses: 0,
        avgTotalRuns: 0,
      };
    row.games += 1;
    if (won) row.wins += 1;
    else if (gameRow.homeScore !== gameRow.awayScore) row.losses += 1;
    row.avgTotalRuns =
      Math.round(
        ((row.avgTotalRuns * (row.games - 1) + gameRow.totalRuns) / row.games) *
          10,
      ) / 10;
    existing.teamStats[teamAbbr] = row;
  }

  if (gameRow.pitchTracking) {
    existing.pitchTracking = gameRow.pitchTracking;
  }

  profiles.set(key, existing);
  return existing;
}

function sanitizeUmpireProfile(profile, meta) {
  const out = {
    ...profile,
    pitchTracking: undefined,
    teamStats: { ...profile.teamStats },
  };

  if (meta.pitchTrackingAvailable && profile.pitchTracking) {
    out.pitchTracking = profile.pitchTracking;
  }

  if (!meta.runLineAvailable) {
    for (const abbr of Object.keys(out.teamStats)) {
      const row = out.teamStats[abbr];
      if (row) {
        out.teamStats[abbr] = { ...row, overRate: undefined };
      }
    }
  }

  return out;
}

async function main() {
  const { date, dryRun } = parseArgs();

  console.log("=== MLB build scaffold ===");
  console.log(`  date=${date}  dryRun=${dryRun}`);

  const schedule = await fetchSchedule(date);
  const dates = schedule.dates ?? [];
  const games = dates.flatMap((d) => d.games ?? []);

  console.log(`  schedule games: ${games.length}`);

  const gameRows = [];
  const profileMap = new Map();
  let pitchTrackingHits = 0;
  let runLineHits = 0;

  for (const game of games) {
    const row = await buildGameRow(game);
    gameRows.push(row);
    upsertUmpireProfile(profileMap, row);
    if (row.pitchTracking) pitchTrackingHits++;
    // runLine not stored on row yet — tracked separately when implemented
    const runLine = await fetchVerifiedRunLine(game.gamePk);
    if (runLine) runLineHits++;
    await new Promise((r) => setTimeout(r, 80));
  }

  const meta = {
    lastUpdated: new Date().toISOString(),
    source: games.length > 0 ? "mlb-stats-api" : "seeded",
    seasons: [...new Set(gameRows.map((g) => g.season).filter(Boolean))],
    leagueAvgRuns: 8.8,
    leagueOverBaseline: 8.5,
    minSampleSize: 30,
    refCount: profileMap.size,
    totalGamesProcessed: gameRows.length,
    pitchTrackingAvailable: pitchTrackingHits > 0,
    runLineAvailable: runLineHits > 0,
    note:
      pitchTrackingHits > 0
        ? "Partial Statcast verification present."
        : "Boxscore + HP umpire crews only. Zone accuracy and run-line modules disabled.",
  };

  const umpires = [...profileMap.values()].map((p) =>
    sanitizeUmpireProfile(p, meta),
  );

  const assignments = {
    lastUpdated: new Date().toISOString(),
    date,
    source: meta.source,
    games: gameRows.map((g) => ({
      gamePk: g.gamePk,
      matchup: `${g.awayTeam} @ ${g.homeTeam}`,
      awayTeam: g.awayTeam,
      homeTeam: g.homeTeam,
      homePlateUmpireId: g.homePlateUmpireId,
      homePlateUmpireName: g.homePlateUmpireName,
      crew: g.crew,
    })),
    note:
      gameRows.length === 0
        ? "No MLB games on this date."
        : "HP umpire assignments from MLB Stats API schedule hydrate.",
  };

  const statsFile = { meta, umpires };
  const gameLogsFile = {
    lastUpdated: meta.lastUpdated,
    league: "MLB",
    source: meta.source,
    games: gameRows,
  };

  console.log("\n  Module gates:");
  console.log(`    pitchTrackingAvailable: ${meta.pitchTrackingAvailable} (${pitchTrackingHits} games)`);
  console.log(`    runLineAvailable:       ${meta.runLineAvailable} (${runLineHits} games)`);
  console.log(`    HP umpires indexed:     ${umpires.length}`);

  if (dryRun) {
    console.log("\n  Dry run — no files written.\n");
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "ref-stats.json"),
    `${JSON.stringify(statsFile, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "game-logs.json"),
    `${JSON.stringify(gameLogsFile, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "assignments.json"),
    `${JSON.stringify(assignments, null, 2)}\n`,
  );

  console.log(`\n  Wrote scaffold to ${OUT_DIR}/\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
