/** Critical-path hints for the homepage hero first paint. */
export function HomeHeroPreload() {
  return (
    <>
      <link
        rel="preload"
        href="/logos/nfl-shield.svg"
        as="image"
        type="image/svg+xml"
      />
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
