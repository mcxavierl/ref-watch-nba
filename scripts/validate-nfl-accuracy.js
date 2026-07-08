#!/usr/bin/env node
/**
 * Internal NFL accuracy validator — cross-checks parsed dataset vs live ESPN boxscores.
 * Usage: node scripts/validate-nfl-accuracy.js [--seed=42] [--refs=3]
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const REF_STATS_PATH = path.join(ROOT, "data", "nfl", "ref-stats.json");
const GAME_LOGS_PATH = path.join(ROOT, "data", "nfl", "game-logs.json");

const ESPN_ABBR = { WSH: "WAS" };

function parseArgs() {
  const seedArg = process.argv.find((a) => a.startsWith("--seed="));
  const refsArg = process.argv.find((a) => a.startsWith("--refs="));
  return {
    seed: seedArg ? Number.parseInt(seedArg.split("=")[1], 10) : 42,
    refCount: refsArg ? Number.parseInt(refsArg.split("=")[1], 10) : 3,
  };
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

function normalizeAbbr(abbr) {
  const u = abbr.toUpperCase();
  return ESPN_ABBR[u] ?? u;
}

function parsePenaltyDisplay(value) {
  const [flagsRaw, yardsRaw] = String(value).split("-");
  return {
    flags: Number.parseInt(flagsRaw ?? "0", 10) || 0,
    yards: Number.parseInt(yardsRaw ?? "0", 10) || 0,
  };
}

function officialWorkedGame(officialName, game) {
  const key = normalizeName(officialName);
  return (game.officials ?? []).some((o) => normalizeName(o.name) === key);
}

function teamOutcome(game, teamAbbr) {
  const home = normalizeAbbr(game.homeTeam);
  const away = normalizeAbbr(game.awayTeam);
  const team = normalizeAbbr(teamAbbr);
  if (team === home) {
    if (game.homeScore > game.awayScore) return "win";
    if (game.homeScore < game.awayScore) return "loss";
    return "push";
  }
  if (team === away) {
    if (game.awayScore > game.homeScore) return "win";
    if (game.awayScore < game.homeScore) return "loss";
    return "push";
  }
  return null;
}

function recomputeRefTeamRecord(officialName, teamAbbr, games) {
  const rows = games.filter(
    (g) =>
      officialWorkedGame(officialName, g) &&
      (normalizeAbbr(g.homeTeam) === normalizeAbbr(teamAbbr) ||
        normalizeAbbr(g.awayTeam) === normalizeAbbr(teamAbbr)),
  );
  let wins = 0;
  let losses = 0;
  for (const g of rows) {
    const outcome = teamOutcome(g, teamAbbr);
    if (outcome === "win") wins++;
    else if (outcome === "loss") losses++;
  }
  return { games: rows.length, wins, losses, rows };
}

async function fetchEspnSummary(gameId) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`,
  );
  if (!res.ok) {
    throw new Error(`ESPN summary ${gameId}: HTTP ${res.status}`);
  }
  return res.json();
}

function parseEspnSummary(body, gameId) {
  const comp = body.header?.competitions?.[0];
  if (!comp) return null;

  let awayAbbr = "";
  let homeAbbr = "";
  let awayScore = 0;
  let homeScore = 0;
  for (const team of comp.competitors ?? []) {
    const abbr = normalizeAbbr(team.team?.abbreviation ?? "");
    const score = Number.parseInt(team.score ?? "0", 10) || 0;
    if (team.homeAway === "home") {
      homeAbbr = abbr;
      homeScore = score;
    } else {
      awayAbbr = abbr;
      awayScore = score;
    }
  }

  const penaltyByAbbr = new Map();
  for (const team of body.boxscore?.teams ?? []) {
    const abbr = normalizeAbbr(team.team?.abbreviation ?? "");
    const stat = team.statistics?.find((s) => s.name === "totalPenaltiesYards");
    if (abbr && stat?.displayValue) {
      penaltyByAbbr.set(abbr, parsePenaltyDisplay(stat.displayValue));
    }
  }

  const homePen = penaltyByAbbr.get(homeAbbr) ?? { flags: 0, yards: 0 };
  const awayPen = penaltyByAbbr.get(awayAbbr) ?? { flags: 0, yards: 0 };

  const officials = (body.gameInfo?.officials ?? []).map((o) =>
    normalizeName(o.fullName ?? o.displayName ?? ""),
  );

  return {
    gameId,
    awayAbbr,
    homeAbbr,
    awayScore,
    homeScore,
    homeFlags: homePen.flags,
    awayFlags: awayPen.flags,
    homePenaltyYards: homePen.yards,
    awayPenaltyYards: awayPen.yards,
    penaltyDisplay: {
      home: `${homePen.flags}-${homePen.yards}`,
      away: `${awayPen.flags}-${awayPen.yards}`,
    },
    officials,
  };
}

function pickRandomRefs(refs, count, rng) {
  const eligible = refs.filter(
    (r) => r.teamStats && Object.keys(r.teamStats).length > 0 && r.games >= 5,
  );
  if (eligible.length === 0) {
    throw new Error("No eligible officials with teamStats in ref-stats.json");
  }
  const picked = [];
  const pool = [...eligible];
  while (picked.length < Math.min(count, pool.length)) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function pickPrimaryTeam(teamStats) {
  return Object.entries(teamStats).sort((a, b) => b[1].games - a[1].games)[0];
}

function check(label, pass, detail) {
  return { label, pass, detail };
}

function printSection(title) {
  console.log(`\n${"─".repeat(72)}`);
  console.log(title);
  console.log("─".repeat(72));
}

function printCheck(c) {
  const icon = c.pass ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${c.label}`);
  if (c.detail) console.log(`         ${c.detail}`);
}

async function validateOfficial(ref, allGames) {
  const [teamAbbr, computed] = pickPrimaryTeam(ref.teamStats);
  const recomputed = recomputeRefTeamRecord(ref.name, teamAbbr, allGames);

  printSection(`${ref.name} (#${ref.number}) × ${teamAbbr}`);

  const aggregateChecks = [];

  const expectedWins = computed.wins ?? Math.round(computed.winRate * computed.games);
  const expectedLosses =
    computed.losses ?? computed.games - expectedWins;

  aggregateChecks.push(
    check(
      "Ref×team games count",
      recomputed.games === computed.games,
      `dataset=${computed.games}  recomputed=${recomputed.games}`,
    ),
  );
  aggregateChecks.push(
    check(
      "Ref×team wins",
      recomputed.wins === expectedWins,
      `dataset=${expectedWins}  recomputed=${recomputed.wins}`,
    ),
  );
  aggregateChecks.push(
    check(
      "Ref×team losses",
      recomputed.losses === expectedLosses,
      `dataset=${expectedLosses}  recomputed=${recomputed.losses}`,
    ),
  );

  for (const c of aggregateChecks) printCheck(c);

  const gameChecks = [];
  const sampleGames = recomputed.rows;

  for (const game of sampleGames) {
    let espn;
    try {
      const raw = await fetchEspnSummary(game.gameId);
      espn = parseEspnSummary(raw, game.gameId);
    } catch (err) {
      gameChecks.push(
        check(
          `Game ${game.gameId} ESPN fetch`,
          false,
          String(err.message ?? err),
        ),
      );
      continue;
    }

    if (!espn) {
      gameChecks.push(
        check(`Game ${game.gameId} ESPN parse`, false, "Missing competition data"),
      );
      continue;
    }

    const scoreOk =
      espn.homeScore === game.homeScore &&
      espn.awayScore === game.awayScore &&
      espn.homeAbbr === normalizeAbbr(game.homeTeam) &&
      espn.awayAbbr === normalizeAbbr(game.awayTeam);

    gameChecks.push(
      check(
        `Game ${game.gameId} score (${game.awayTeam} ${game.awayScore} @ ${game.homeTeam} ${game.homeScore})`,
        scoreOk,
        scoreOk
          ? "matches ESPN"
          : `ESPN: ${espn.awayAbbr} ${espn.awayScore} @ ${espn.homeAbbr} ${espn.homeScore}`,
      ),
    );

    const flagsOk =
      espn.homeFlags === game.homeFlags && espn.awayFlags === game.awayFlags;
    gameChecks.push(
      check(
        `Game ${game.gameId} penalty flags`,
        flagsOk,
        flagsOk
          ? `home ${game.homeFlags} / away ${game.awayFlags}`
          : `dataset home/away=${game.homeFlags}/${game.awayFlags}  ESPN home/away=${espn.homeFlags}/${espn.awayFlags} (${espn.penaltyDisplay.home}, ${espn.penaltyDisplay.away})`,
      ),
    );

    const yardsOk =
      espn.homePenaltyYards === game.homePenaltyYards &&
      espn.awayPenaltyYards === game.awayPenaltyYards;
    gameChecks.push(
      check(
        `Game ${game.gameId} penalty yards (totalPenaltiesYards)`,
        yardsOk,
        yardsOk
          ? `home ${game.homePenaltyYards} / away ${game.awayPenaltyYards}`
          : `dataset home/away=${game.homePenaltyYards}/${game.awayPenaltyYards}  ESPN=${espn.penaltyDisplay.home}, ${espn.penaltyDisplay.away}`,
      ),
    );

    const outcome = teamOutcome(game, teamAbbr);
    const espnOutcome = teamOutcome(
      {
        homeTeam: espn.homeAbbr,
        awayTeam: espn.awayAbbr,
        homeScore: espn.homeScore,
        awayScore: espn.awayScore,
      },
      teamAbbr,
    );
    gameChecks.push(
      check(
        `Game ${game.gameId} ${teamAbbr} outcome`,
        outcome === espnOutcome,
        `${teamAbbr} ${outcome} (dataset) vs ${espnOutcome} (ESPN recomputed)`,
      ),
    );

    const onCrew = espn.officials.includes(normalizeName(ref.name));
    gameChecks.push(
      check(
        `Game ${game.gameId} official on ESPN crew`,
        onCrew,
        onCrew ? `${ref.name} listed` : `ESPN crew: ${espn.officials.join(", ")}`,
      ),
    );

    await new Promise((r) => setTimeout(r, 120));
  }

  console.log("\n  Per-game ESPN cross-checks:");
  for (const c of gameChecks) printCheck(c);

  const allPass = [...aggregateChecks, ...gameChecks].every((c) => c.pass);
  return { ref: ref.name, team: teamAbbr, allPass, total: aggregateChecks.length + gameChecks.length };
}

async function main() {
  const { seed, refCount } = parseArgs();
  const rng = mulberry32(seed);

  const refStats = JSON.parse(fs.readFileSync(REF_STATS_PATH, "utf8"));
  const gameLogs = JSON.parse(fs.readFileSync(GAME_LOGS_PATH, "utf8"));

  console.log("NFL accuracy validation");
  console.log(`  ref-stats source: ${refStats.meta?.source ?? "unknown"}`);
  console.log(`  game-logs source: ${gameLogs.source ?? "unknown"} (${gameLogs.games?.length ?? 0} games)`);
  console.log(`  seed=${seed}  officials=${refCount}`);

  if (refStats.meta?.source !== "espn") {
    console.warn("\n  WARN: ref-stats meta.source is not 'espn' — ESPN cross-check may fail.\n");
  }

  const officials = pickRandomRefs(refStats.refs ?? [], refCount, rng);
  const results = [];

  for (const ref of officials) {
    results.push(await validateOfficial(ref, gameLogs.games ?? []));
  }

  printSection("Summary");
  let failures = 0;
  for (const r of results) {
    const status = r.allPass ? "PASS" : "FAIL";
    if (!r.allPass) failures++;
    console.log(`  [${status}] ${r.ref} × ${r.team} (${r.total} checks)`);
  }

  console.log(`\n  Overall: ${failures === 0 ? "ALL PASSED" : `${failures}/${results.length} officials failed`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
