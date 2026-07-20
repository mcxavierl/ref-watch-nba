import { leagueLogoSrc } from "@/lib/league-logo-src";

/** Critical-path hints for the homepage hero first paint. */
export function HomeHeroPreload() {
  const nflLogo = leagueLogoSrc("nfl", "dark");

  return (
    <>
      {nflLogo ? (
        <link
          rel="preload"
          href={nflLogo}
          as="image"
          type="image/svg+xml"
        />
      ) : null}
      <link
        rel="preconnect"
        href="https://cdn.nba.com"
        crossOrigin="anonymous"
      />
      <link
        rel="preconnect"
        href="https://assets.nhle.com"
        crossOrigin="anonymous"
      />
    </>
  );
}
