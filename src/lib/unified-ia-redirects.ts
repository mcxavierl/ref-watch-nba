/**
 * Legacy path redirects for unified /{league} IA.
 * Used by next.config.ts redirects().
 */
export type LegacyRedirect = {
  source: string;
  destination: string;
  permanent: boolean;
};

function leagueLegacyRedirects(league: string): LegacyRedirect[] {
  const prefix = league === "nba" ? "/nba" : `/${league}`;
  return [
    {
      source: `${prefix}/rankings`,
      destination: `${prefix}/research/tendencies`,
      permanent: true,
    },
    {
      source: `${prefix}/trends`,
      destination: `${prefix}/research/trends`,
      permanent: true,
    },
    {
      source: `${prefix}/insights`,
      destination: `${prefix}/research/tendencies`,
      permanent: true,
    },
    {
      source: `${prefix}/research/findings/findings/:id`,
      destination: `${prefix}/research/findings/:id`,
      permanent: true,
    },
  ];
}

/** NBA root-path redirects before unified prefix migration. */
export function nbaRootLegacyRedirects(): LegacyRedirect[] {
  return [
    { source: "/refs", destination: "/nba/refs", permanent: true },
    { source: "/refs/:slug", destination: "/nba/refs/:slug", permanent: true },
    { source: "/matrix", destination: "/nba/matrix", permanent: true },
    { source: "/teams", destination: "/nba/teams", permanent: true },
    { source: "/teams/:abbr", destination: "/nba/teams/:abbr", permanent: true },
    { source: "/rankings", destination: "/nba/research/tendencies", permanent: true },
    { source: "/trends", destination: "/nba/research/trends", permanent: true },
    { source: "/insights", destination: "/nba/research/tendencies", permanent: true },
    {
      source: "/crews",
      destination: "/nba/refs",
      permanent: true,
    },
    {
      source: "/raptors",
      destination: "/nba/teams/TOR",
      permanent: true,
    },
    {
      source: "/lakers",
      destination: "/nba/teams/LAL",
      permanent: true,
    },
  ];
}

/** Legacy slug segments before unified /refs/ IA (e.g. /ref/, /official/). */
export function slugLegacyRedirects(): LegacyRedirect[] {
  const redirects: LegacyRedirect[] = [
    { source: "/ref/:slug", destination: "/nba/refs/:slug", permanent: true },
    { source: "/referee/:slug", destination: "/nba/refs/:slug", permanent: true },
    { source: "/official/:slug", destination: "/nba/refs/:slug", permanent: true },
    { source: "/officials/:slug", destination: "/nba/refs/:slug", permanent: true },
  ];

  const leagues = ["nba", "nhl", "nfl", "epl", "laliga", "wnba", "cbb", "cfb"];
  for (const league of leagues) {
    redirects.push(
      {
        source: `/${league}/ref/:slug`,
        destination: `/${league}/refs/:slug`,
        permanent: true,
      },
      {
        source: `/${league}/referee/:slug`,
        destination: `/${league}/refs/:slug`,
        permanent: true,
      },
      {
        source: `/${league}/official/:slug`,
        destination: `/${league}/refs/:slug`,
        permanent: true,
      },
      {
        source: `/${league}/officials/:slug`,
        destination: `/${league}/refs/:slug`,
        permanent: true,
      },
    );
  }

  return redirects;
}

export function unifiedIALegacyRedirects(): LegacyRedirect[] {
  const leagues = ["nba", "nhl", "nfl", "epl", "laliga", "wnba", "cbb", "cfb"];
  const redirects: LegacyRedirect[] = [
    ...nbaRootLegacyRedirects(),
    ...slugLegacyRedirects(),
  ];

  for (const league of leagues) {
    redirects.push(...leagueLegacyRedirects(league));
    redirects.push({
      source: `/${league}/crews`,
      destination: `/${league}/refs`,
      permanent: true,
    });
    redirects.push({
      source: `/${league}/compare`,
      destination: "/compare",
      permanent: true,
    });
  }

  return redirects;
}
