import * as fs from "node:fs";
import * as path from "node:path";
import bundled from "../../../data/worldcup/final-2026.json";
import type { Finding } from "@/lib/findings-shared";
import { resolveFindingExplainer } from "@/lib/findings-shared";

export type WorldCupTeam = {
  code: string;
  name: string;
  confederation: string;
  rank?: number;
};

export type WorldCupOfficial = {
  name: string;
  country: string;
  countryCode?: string;
  role?: string;
};

export type WorldCupRefAssignment = {
  stage: string;
  matchup: string;
  date: string;
  yellowCards?: number;
  redCards?: number;
  fouls?: number;
  note?: string;
};

export type WorldCupTeamPath = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  comebackWins?: number;
  extraTimeWins?: number;
  cleanSheets?: number;
  note?: string;
};

export type WorldCupFinalCatalog = {
  generatedAt: string;
  source: string;
  note: string;
  match: {
    id: string;
    date: string;
    kickoffLocal: string;
    timezoneLabel: string;
    venue: string;
    venueDisplay: string;
    venueCity: string;
    awayTeam: WorldCupTeam;
    homeTeam: WorldCupTeam;
    stage: string;
    matchNumber: number;
    fifaMatchUrl: string;
  };
  officials: {
    referee: WorldCupOfficial;
    assistantReferees: WorldCupOfficial[];
    fourthOfficial: WorldCupOfficial;
    reserveAssistant: WorldCupOfficial;
    videoAssistantReferee: WorldCupOfficial;
    assistantVar: WorldCupOfficial;
  };
  refereeProfile: {
    fifaListedSince: number;
    majorFinals: string[];
    tournamentAssignments: WorldCupRefAssignment[];
    priorWorldCupWithArgentina?: {
      matchup: string;
      tournament: string;
      result: string;
      yellowCards: number;
    };
  };
  teamPaths: Record<string, WorldCupTeamPath>;
  headToHead: {
    meetings: number;
    argentinaWins: number;
    spainWins: number;
    draws: number;
    lastMeeting: string;
  };
  tournamentContext: {
    headline: string;
    detail: string;
  };
};

export type ResolvedWorldCupFinal = WorldCupFinalCatalog & {
  kickoffLabel: string;
  dateLabel: string;
  isUpcoming: boolean;
};

function readCatalog(): WorldCupFinalCatalog {
  try {
    const disk = path.join(process.cwd(), "data", "worldcup", "final-2026.json");
    if (fs.existsSync(disk)) {
      return JSON.parse(fs.readFileSync(disk, "utf8")) as WorldCupFinalCatalog;
    }
  } catch {
    /* bundled fallback */
  }
  return bundled as WorldCupFinalCatalog;
}

function formatKickoffLabel(date: string, kickoffLocal: string, timezoneLabel: string): string {
  const kickoff = new Date(`${date}T${kickoffLocal}:00`);
  const dateLabel = kickoff.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const [hour, minute] = kickoffLocal.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minuteLabel = minute.toString().padStart(2, "0");
  return `${dateLabel} · ${hour12}:${minuteLabel} ${period} ${timezoneLabel}`;
}

function formatDateLabel(date: string): string {
  const kickoff = new Date(`${date}T12:00:00`);
  return kickoff.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function wcExplainer(text: string): string {
  return resolveFindingExplainer(text);
}

function loggedAssignments(assignments: WorldCupRefAssignment[]): WorldCupRefAssignment[] {
  return assignments.filter(
    (assignment) => assignment.yellowCards !== undefined || assignment.redCards !== undefined,
  );
}

export function getWorldCupFinalCatalog(): WorldCupFinalCatalog {
  return readCatalog();
}

export function resolveWorldCupFinal(): ResolvedWorldCupFinal | null {
  const catalog = readCatalog();
  const kickoffMs = new Date(
    `${catalog.match.date}T${catalog.match.kickoffLocal}:00-04:00`,
  ).getTime();
  const isUpcoming = Number.isFinite(kickoffMs) && kickoffMs > Date.now();

  return {
    ...catalog,
    kickoffLabel: formatKickoffLabel(
      catalog.match.date,
      catalog.match.kickoffLocal,
      catalog.match.timezoneLabel,
    ),
    dateLabel: formatDateLabel(catalog.match.date),
    isUpcoming,
  };
}

export function worldCupFinalMeta(): {
  source: string;
  note: string;
} {
  const catalog = readCatalog();
  return {
    source: catalog.source,
    note: catalog.note,
  };
}

/** Analytics cards for the World Cup final preview. */
export function computeWorldCupFinalFindings(limit = 4): Finding[] {
  const catalog = readCatalog();
  const { match, officials, refereeProfile, teamPaths, headToHead, tournamentContext } =
    catalog;
  const findings: Finding[] = [];

  const logged = loggedAssignments(refereeProfile.tournamentAssignments);
  const totalYellow = logged.reduce((sum, row) => sum + (row.yellowCards ?? 0), 0);
  const totalRed = logged.reduce((sum, row) => sum + (row.redCards ?? 0), 0);
  const avgYellow =
    logged.length > 0 ? totalYellow / logged.length : undefined;

  findings.push({
    id: "wc-final-referee",
    category: "ref-outlier",
    headline: `${officials.referee.name} appointed for the World Cup final`,
    summary: `${officials.referee.country} leads the crew at ${match.venueDisplay}. FIFA listed since ${refereeProfile.fifaListedSince}; ${refereeProfile.majorFinals.at(-1)}.`,
    explainer: wcExplainer(
      "FIFA names the final referee from its top-graded pool. Vinčić also handled the 2024 Champions League final and three matches at this World Cup.",
    ),
    stats: [
      {
        label: "Referee",
        value: officials.referee.name,
        detail: officials.referee.country,
      },
      {
        label: "VAR",
        value: officials.videoAssistantReferee.name,
        detail: officials.videoAssistantReferee.country,
      },
    ],
    sampleNote: "Source: FIFA officials announcement, July 16, 2026",
    links: [{ label: "FIFA match centre", href: match.fifaMatchUrl }],
  });

  if (avgYellow !== undefined) {
    findings.push({
      id: "wc-final-ref-cards",
      category: "whistle-extreme",
      headline: `Vinčić averaged ${avgYellow.toFixed(1)} yellow cards in logged World Cup 2026 assignments`,
      summary: `${totalYellow} yellows and ${totalRed} red across ${logged.length} fully logged matches, including a VAR-upheld straight red in Mexico vs Ecuador.`,
      explainer: wcExplainer(
        "Card volume in earlier rounds helps frame how tight the final crew may run discipline. This is descriptive context, not a betting signal.",
      ),
      stats: [
        {
          label: "Yellow cards",
          value: String(totalYellow),
          detail: `${logged.length} logged matches`,
        },
        {
          label: "Red cards",
          value: String(totalRed),
          detail: "Including VAR review",
        },
      ],
      sampleNote: "Sample: Brazil-Morocco and Mexico-Ecuador FIFA reports",
      links: [],
    });
  }

  const spain = teamPaths.ESP;
  if (spain) {
    findings.push({
      id: "wc-final-spain-defense",
      category: "scoring-extreme",
      headline: `Spain conceded ${spain.goalsAgainst} goals through ${spain.played} World Cup matches`,
      summary: `${spain.cleanSheets ?? 0} clean sheets in the run to the final. France, Portugal, and Belgium all failed to score more than once.`,
      explainer: wcExplainer(
        "Spain's defensive floor is the story of their knockout path. Low goals against often tracks with fewer late-card chaos scenarios.",
      ),
      stats: [
        {
          label: "Goals against",
          value: String(spain.goalsAgainst),
          detail: `${spain.played} matches`,
        },
        {
          label: "Record",
          value: `${spain.wins}W-${spain.draws}D-${spain.losses}L`,
          detail: `${spain.goalsFor} scored`,
        },
      ],
      sampleNote: "Tournament path through semifinal",
      links: [],
    });
  }

  const argentina = teamPaths.ARG;
  if (argentina) {
    findings.push({
      id: "wc-final-argentina-comebacks",
      category: "league-trend",
      headline: `Argentina won ${argentina.comebackWins ?? 0} knockout comebacks on the road to the final`,
      summary: `${argentina.goalsFor} goals scored in ${argentina.played} matches, including extra-time wins over Cape Verde and Switzerland.`,
      explainer: wcExplainer(
        "Late equalizers and winners stretch stoppage time and can add cards as tension rises. Argentina's knockout resilience is a real pace-of-play factor.",
      ),
      stats: [
        {
          label: "Knockout comebacks",
          value: String(argentina.comebackWins ?? 0),
          detail: `${argentina.extraTimeWins ?? 0} extra-time wins`,
        },
        {
          label: "Goals",
          value: `${argentina.goalsFor}-${argentina.goalsAgainst}`,
          detail: "For-against",
        },
      ],
      sampleNote: "Tournament path through semifinal",
      links: [],
    });
  }

  findings.push({
    id: "wc-final-rankings",
    category: "league-trend",
    headline: tournamentContext.headline,
    summary: `${match.awayTeam.name} (#${match.awayTeam.rank}) vs ${match.homeTeam.name} (#${match.homeTeam.rank}). All-time H2H: ${headToHead.argentinaWins}-${headToHead.draws}-${headToHead.spainWins}.`,
    explainer: wcExplainer(tournamentContext.detail),
    stats: [
      {
        label: "FIFA rank",
        value: `#${match.awayTeam.rank} vs #${match.homeTeam.rank}`,
        detail: "June 2026 rankings",
      },
      {
        label: "Last meeting",
        value: headToHead.lastMeeting.split(" (")[0] ?? headToHead.lastMeeting,
        detail: "Friendly, 2018",
      },
    ],
    sampleNote: `${headToHead.meetings} all-time meetings`,
    links: [],
  });

  if (refereeProfile.priorWorldCupWithArgentina) {
    const prior = refereeProfile.priorWorldCupWithArgentina;
    findings.push({
      id: "wc-final-vincic-argentina-history",
      category: "ref-outlier",
      headline: `Vinčić also refereed Argentina's 2022 World Cup opener`,
      summary: `${prior.result}. ${prior.yellowCards} yellow cards shown in that match.`,
      explainer: wcExplainer(
        "Prior Argentina assignments are context for crew familiarity, not a prediction of how Sunday's final will be officiated.",
      ),
      stats: [
        {
          label: "2022 match",
          value: prior.result.replace("Argentina ", ""),
          detail: prior.matchup,
        },
        {
          label: "Cards",
          value: String(prior.yellowCards),
          detail: "Yellow cards",
        },
      ],
      sampleNote: "2022 FIFA World Cup",
      links: [],
    });
  }

  return findings.slice(0, limit);
}
