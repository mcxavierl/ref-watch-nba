import type { MetadataRoute } from "next";
import { getAllRefSlugs, getAssignments, getRefStats } from "@/lib/data";
import {
  getAllRefSlugs as getNhlRefSlugs,
  getAssignments as getNhlAssignments,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import {
  getAllRefSlugs as getNflRefSlugs,
  getAssignments as getNflAssignments,
  getRefStats as getNflRefStats,
} from "@/lib/nfl/data";
import {
  getAllRefSlugs as getEplRefSlugs,
  getAssignments as getEplAssignments,
  getRefStats as getEplRefStats,
} from "@/lib/epl/data";
import {
  getAllRefSlugs as getCbbRefSlugs,
  getAssignments as getCbbAssignments,
  getRefStats as getCbbRefStats,
} from "@/lib/cbb/data";
import {
  getAllRefSlugs as getCfbRefSlugs,
  getAssignments as getCfbAssignments,
  getRefStats as getCfbRefStats,
} from "@/lib/cfb/data";
import { researchFindingHref } from "@/lib/findings-shared";
import { getAllResearchFindingIds, getResearchFindingById } from "@/lib/research";
import { absoluteUrl } from "@/lib/site";
import { NBA_TEAMS } from "@/lib/teams";
import { NHL_TEAMS } from "@/lib/nhl/teams";
import { NFL_TEAMS } from "@/lib/nfl/teams";
import { EPL_TEAMS } from "@/lib/epl/teams";
import { CBB_TEAMS } from "@/lib/cbb/teams";
import { CFB_TEAMS } from "@/lib/cfb/teams";
import type { LeagueId } from "@/lib/leagues";
import { leagueHref } from "@/lib/leagues";

function maxIso(...dates: (string | undefined)[]): string {
  const valid = dates.filter(Boolean).map((d) => new Date(d!).getTime());
  if (valid.length === 0) return new Date().toISOString();
  return new Date(Math.max(...valid)).toISOString();
}

type LeagueSitemapConfig = {
  id: LeagueId;
  getAssignments: () => { lastUpdated?: string; games: unknown[] };
  getRefStats: () => { meta: { lastUpdated?: string } };
  getRefSlugs: () => string[];
  teams: Array<{ abbr: string }>;
  hubPages: string[];
  includeFeeds?: boolean;
};

const SHARED_HUB_PAGES = [
  "refs",
  "crews",
  "matrix",
  "teams",
  "insights",
  "rankings",
  "trends",
  "research",
];

function leagueSitemapEntries(config: LeagueSitemapConfig): MetadataRoute.Sitemap {
  const assignments = config.getAssignments();
  const stats = config.getRefStats();
  const lastMod = maxIso(assignments.lastUpdated, stats.meta.lastUpdated);
  const prefix = leagueHref(config.id, "/");

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(prefix === "/" ? "/" : prefix),
      lastModified: lastMod,
      changeFrequency: "daily",
      priority: config.id === "nba" ? 1 : 0.95,
    },
  ];

  for (const hub of config.hubPages) {
    entries.push({
      url: absoluteUrl(leagueHref(config.id, `/${hub}`)),
      lastModified: stats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: hub === "matrix" ? 0.72 : 0.7,
    });
  }

  if (config.includeFeeds) {
    const feedLeague = config.id;
    entries.push(
      {
        url: absoluteUrl(`/feed/${feedLeague}/json`),
        lastModified: lastMod,
        changeFrequency: "hourly",
        priority: 0.6,
      },
      {
        url: absoluteUrl(`/feed/${feedLeague}/rss`),
        lastModified: lastMod,
        changeFrequency: "hourly",
        priority: 0.5,
      },
    );
  }

  for (const slug of config.getRefSlugs()) {
    entries.push({
      url: absoluteUrl(leagueHref(config.id, `/refs/${slug}`)),
      lastModified: stats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const team of config.teams) {
    entries.push({
      url: absoluteUrl(leagueHref(config.id, `/teams/${team.abbr}`)),
      lastModified: stats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return entries;
}

export function buildSitemapEntries(): MetadataRoute.Sitemap {
  const nbaStats = getRefStats();
  const nhlStats = getNhlRefStats();
  const globalLastMod = maxIso(
    nbaStats.meta.lastUpdated,
    nhlStats.meta.lastUpdated,
  );

  const leagueConfigs: LeagueSitemapConfig[] = [
    {
      id: "nba",
      getAssignments,
      getRefStats,
      getRefSlugs: getAllRefSlugs,
      teams: NBA_TEAMS,
      hubPages: SHARED_HUB_PAGES,
      includeFeeds: true,
    },
    {
      id: "nhl",
      getAssignments: getNhlAssignments,
      getRefStats: getNhlRefStats,
      getRefSlugs: getNhlRefSlugs,
      teams: NHL_TEAMS,
      hubPages: SHARED_HUB_PAGES,
      includeFeeds: true,
    },
    {
      id: "nfl",
      getAssignments: getNflAssignments,
      getRefStats: getNflRefStats,
      getRefSlugs: getNflRefSlugs,
      teams: NFL_TEAMS,
      hubPages: SHARED_HUB_PAGES,
    },
    {
      id: "epl",
      getAssignments: getEplAssignments,
      getRefStats: getEplRefStats,
      getRefSlugs: getEplRefSlugs,
      teams: EPL_TEAMS,
      hubPages: SHARED_HUB_PAGES,
    },
    {
      id: "cbb",
      getAssignments: getCbbAssignments,
      getRefStats: getCbbRefStats,
      getRefSlugs: getCbbRefSlugs,
      teams: CBB_TEAMS,
      hubPages: SHARED_HUB_PAGES,
    },
    {
      id: "cfb",
      getAssignments: getCfbAssignments,
      getRefStats: getCfbRefStats,
      getRefSlugs: getCfbRefSlugs,
      teams: CFB_TEAMS,
      hubPages: SHARED_HUB_PAGES,
    },
  ];

  const entries: MetadataRoute.Sitemap = [
    ...leagueConfigs.flatMap((config) => leagueSitemapEntries(config)),
    {
      url: absoluteUrl("/methodology"),
      lastModified: globalLastMod,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/partners"),
      lastModified: globalLastMod,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  for (const id of getAllResearchFindingIds()) {
    const finding = getResearchFindingById(id);
    if (!finding) continue;
    entries.push({
      url: absoluteUrl(researchFindingHref(finding)),
      lastModified: globalLastMod,
      changeFrequency: "monthly",
      priority: 0.55,
    });
  }

  return entries;
}
