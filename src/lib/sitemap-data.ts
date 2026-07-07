import { getAllRefSlugs, getAssignments, getRefStats } from "@/lib/data";
import {
  getAllRefSlugs as getNhlRefSlugs,
  getAssignments as getNhlAssignments,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import { absoluteUrl } from "@/lib/site";
import { NBA_TEAMS } from "@/lib/teams";
import { NHL_TEAMS } from "@/lib/nhl/teams";
import type { MetadataRoute } from "next";

function maxIso(...dates: (string | undefined)[]): string {
  const valid = dates.filter(Boolean).map((d) => new Date(d!).getTime());
  if (valid.length === 0) return new Date().toISOString();
  return new Date(Math.max(...valid)).toISOString();
}

export function buildSitemapEntries(): MetadataRoute.Sitemap {
  const nbaAssignments = getAssignments();
  const nbaStats = getRefStats();
  const nhlAssignments = getNhlAssignments();
  const nhlStats = getNhlRefStats();

  const slateLastMod = maxIso(
    nbaAssignments.lastUpdated,
    nbaStats.meta.lastUpdated,
  );
  const nhlSlateLastMod = maxIso(
    nhlAssignments.lastUpdated,
    nhlStats.meta.lastUpdated,
  );

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: slateLastMod,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/nhl"),
      lastModified: nhlSlateLastMod,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/refs"),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/teams"),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/nhl/refs"),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/nhl/teams"),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/feed/nba.json"),
      lastModified: slateLastMod,
      changeFrequency: "hourly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/feed/nhl.json"),
      lastModified: nhlSlateLastMod,
      changeFrequency: "hourly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/feed/nba.xml"),
      lastModified: slateLastMod,
      changeFrequency: "hourly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/feed/nhl.xml"),
      lastModified: nhlSlateLastMod,
      changeFrequency: "hourly",
      priority: 0.5,
    },
  ];

  for (const slug of getAllRefSlugs()) {
    entries.push({
      url: absoluteUrl(`/refs/${slug}`),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const team of NBA_TEAMS) {
    entries.push({
      url: absoluteUrl(`/teams/${team.abbr}`),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  for (const slug of getNhlRefSlugs()) {
    entries.push({
      url: absoluteUrl(`/nhl/refs/${slug}`),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const team of NHL_TEAMS) {
    entries.push({
      url: absoluteUrl(`/nhl/teams/${team.abbr}`),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return entries;
}
