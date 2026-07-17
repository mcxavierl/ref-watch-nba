/** Reserves space for SeasonScopeToggle while useSearchParams hydrates. */
export function SeasonScopeToggleSkeleton({ pillCount = 3 }: { pillCount?: number }) {
  return (
    <div
      className="refs-directory-metric-toggle season-scope-toggle cls-skeleton-toggle"
      aria-hidden
    >
      {Array.from({ length: pillCount }, (_, index) => (
        <span
          key={index}
          className={`refs-directory-metric-btn cls-skeleton-pill${index === 1 ? " cls-skeleton-pill--active" : ""}`}
        />
      ))}
    </div>
  );
}

/** Reserves matrix table height before RefTeamMatrix hydrates. */
export function RefTeamMatrixSkeleton({ refCount = 10 }: { refCount?: number }) {
  const minHeightRem = Math.min(70, 5 + Math.max(refCount, 6) * 2.1);

  return (
    <div
      className="cls-skeleton-panel ref-matrix-skeleton"
      aria-busy="true"
      aria-label="Loading ref team matrix"
      style={{ minHeight: `${minHeightRem}rem` }}
    />
  );
}

export function OverviewEditorialNarrativeSkeleton() {
  return (
    <div className="overview-editorial-narrative" aria-hidden>
      <section className="overview-editorial-section overview-editorial-section--featured section-block">
        <div className="overview-section-header overview-section-header--primary">
          <span className="cls-skeleton-line cls-skeleton-line--title" />
          <span className="cls-skeleton-line cls-skeleton-line--lead" />
        </div>
        <div className="cls-skeleton-panel overview-insight-skeleton-card" />
      </section>
      <section className="overview-editorial-section overview-editorial-section--trends section-block">
        <div className="overview-editorial-trends-grid">
          <div className="cls-skeleton-panel overview-insight-skeleton-card overview-insight-skeleton-card--compact" />
          <div className="cls-skeleton-panel overview-insight-skeleton-card overview-insight-skeleton-card--compact" />
        </div>
      </section>
    </div>
  );
}

export function OverviewQuickInsightsSkeleton() {
  return (
    <section
      className="overview-editorial-section overview-editorial-section--quick section-block overview-section--secondary"
      aria-hidden
    >
      <div className="overview-editorial-quick-grid">
        <div className="cls-skeleton-panel overview-insight-skeleton-card overview-insight-skeleton-card--compact" />
        <div className="cls-skeleton-panel overview-insight-skeleton-card overview-insight-skeleton-card--compact" />
        <div className="cls-skeleton-panel overview-insight-skeleton-card overview-insight-skeleton-card--compact" />
      </div>
    </section>
  );
}

export function OverviewSecondaryTabsSkeleton() {
  return (
    <section className="overview-secondary-tabs section-block overview-section--secondary" aria-hidden>
      <div className="overview-secondary-tabs-bar">
        <span className="overview-secondary-tab cls-skeleton-pill cls-skeleton-pill--wide" />
        <span className="overview-secondary-tab cls-skeleton-pill cls-skeleton-pill--wide" />
      </div>
      <div className="cls-skeleton-panel overview-secondary-tabs-skeleton-panel" />
    </section>
  );
}

export function LeagueIngestGateSkeleton({ leagueLabel }: { leagueLabel: string }) {
  return (
    <div className="page-shell" aria-busy="true" aria-label={`Loading ${leagueLabel}`}>
      <section className="page-hero max-w-2xl">
        <span className="cls-skeleton-line cls-skeleton-line--kicker" />
        <span className="cls-skeleton-line cls-skeleton-line--title" />
        <span className="cls-skeleton-line cls-skeleton-line--lead" />
      </section>
    </div>
  );
}