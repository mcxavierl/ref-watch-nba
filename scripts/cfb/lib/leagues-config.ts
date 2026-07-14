import * as fs from "node:fs";
import * as path from "node:path";
import { CFB_TEAMS } from "../../../src/lib/cfb/teams";

export interface CfbConferenceConfig {
  slug: string;
  name: string;
  ingest: boolean;
}

export interface LeaguesConfigFile {
  cfb: {
    conferences: CfbConferenceConfig[];
  };
}

const CONFIG_PATH = path.join(process.cwd(), "config", "leagues.json");

const DEFAULT_CONFIG: LeaguesConfigFile = {
  cfb: {
    conferences: [
      { slug: "acc", name: "ACC", ingest: true },
      { slug: "sec", name: "SEC", ingest: true },
      { slug: "big-ten", name: "Big Ten", ingest: true },
      { slug: "big-12", name: "Big 12", ingest: false },
    ],
  },
};

export function normalizeConferenceSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, "-");
}

export function loadLeaguesConfig(): LeaguesConfigFile {
  if (!fs.existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as Partial<LeaguesConfigFile>;
    const conferences = raw.cfb?.conferences;
    if (!Array.isArray(conferences) || conferences.length === 0) {
      return DEFAULT_CONFIG;
    }
    return {
      cfb: {
        conferences: conferences.map((entry) => ({
          slug: normalizeConferenceSlug(entry.slug),
          name: entry.name,
          ingest: Boolean(entry.ingest),
        })),
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Conferences to process: all with ingest=true, or a single slug when debugging. */
export function resolveCfbConferencesToProcess(
  leagueSlug?: string,
): CfbConferenceConfig[] {
  const config = loadLeaguesConfig();
  if (leagueSlug) {
    const normalized = normalizeConferenceSlug(leagueSlug);
    const match = config.cfb.conferences.find((conf) => conf.slug === normalized);
    if (!match) {
      const available = config.cfb.conferences.map((conf) => conf.slug).join(", ");
      throw new Error(
        `Unknown CFB conference slug "${leagueSlug}". Available: ${available}`,
      );
    }
    return [match];
  }
  return config.cfb.conferences.filter((conf) => conf.ingest);
}

export function getCfbIngestConferenceNames(leagueSlug?: string): string[] {
  return resolveCfbConferencesToProcess(leagueSlug).map((conf) => conf.name);
}

export function getCfbTeamAbbrsForConference(conferenceName: string): string[] {
  return CFB_TEAMS.filter((team) => team.conference === conferenceName).map(
    (team) => team.abbr,
  );
}

export function gameTouchesCfbConference(
  homeTeam: string,
  awayTeam: string,
  conferenceName: string,
): boolean {
  const home = CFB_TEAMS.find((team) => team.abbr === homeTeam.toUpperCase());
  const away = CFB_TEAMS.find((team) => team.abbr === awayTeam.toUpperCase());
  return (
    home?.conference === conferenceName || away?.conference === conferenceName
  );
}

export function shouldIngestCfbGame(
  homeTeam: string,
  awayTeam: string,
  leagueSlug?: string,
): boolean {
  const conferences = resolveCfbConferencesToProcess(leagueSlug);
  return conferences.some((conf) =>
    gameTouchesCfbConference(homeTeam, awayTeam, conf.name),
  );
}

export function parseLeagueArg(argv: string[]): string | undefined {
  for (const arg of argv) {
    if (arg.startsWith("--league=")) {
      return arg.slice("--league=".length);
    }
    if (arg === "--league") {
      const index = argv.indexOf(arg);
      const value = argv[index + 1];
      if (value) return value;
    }
  }
  return undefined;
}
