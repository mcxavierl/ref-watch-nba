import { getAllRefSlugs, getAssignments, getRefStats } from "@/lib/data";
import {
  getAllRefSlugs as getNhlRefSlugs,
  getAssignments as getNhlAssignments,
  getRefStats as getNhlRefStats,
} from "@/lib/nhl/data";
import { getAllResearchFindingIds, getResearchFindingById } from "@/lib/research";
import { researchFindingHref } from "@/lib/findings-shared";
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
      url: absoluteUrl("/rankings"),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/nhl/rankings"),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/trends"),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/nhl/trends"),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/research"),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/nhl/research"),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/methodology"),
      lastModified: maxIso(nbaStats.meta.lastUpdated, nhlStats.meta.lastUpdated),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/refs"),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/matrix"),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: absoluteUrl("/crews"),
      lastModified: nbaStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.71,
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
      url: absoluteUrl("/nhl/matrix"),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.72,
    },
    {
      url: absoluteUrl("/nhl/crews"),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.71,
    },
    {
      url: absoluteUrl("/nhl/teams"),
      lastModified: nhlStats.meta.lastUpdated,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/feed/nba/json"),
      lastModified: slateLastMod,
      changeFrequency: "hourly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/feed/nhl/json"),
      lastModified: nhlSlateLastMod,
      changeFrequency: "hourly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/feed/nba/rss"),
      lastModified: slateLastMod,
      changeFrequency: "hourly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/feed/nhl/rss"),
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

  for (const id of getAllResearchFindingIds()) {
    const finding = getResearchFindingById(id);
    if (!finding) continue;
    entries.push({
      url: absoluteUrl(researchFindingHref(finding)),
      lastModified:
        finding.league === "NHL"
          ? nhlStats.meta.lastUpdated
          : nbaStats.meta.lastUpdated,
      changeFrequency: "monthly",
      priority: 0.55,
    });
  }

  return entries;
}
