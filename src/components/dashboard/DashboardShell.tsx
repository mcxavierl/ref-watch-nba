import type { ReactNode } from "react";

export function DashboardShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`dashboard-shell overview-page ${className}`.trim()}>
      {children}
    </div>
  );
}

export function DashboardHeroSection({
  eyebrow,
  title,
  titleId,
  lead,
  highlights,
}: {
  eyebrow: string;
  title: string;
  titleId: string;
  lead: ReactNode;
  highlights: ReactNode;
}) {
  return (
    <section
      className="overview-hero section-block dashboard-hero"
      aria-labelledby={titleId}
    >
      <div className="overview-hero-copy">
        <p className="overview-eyebrow">{eyebrow}</p>
        <h1 className="overview-title" id={titleId}>
          {title}
        </h1>
      </div>

      <div className="overview-hero-highlights">{highlights}</div>

      <p className="overview-lead overview-lead--hero">{lead}</p>
    </section>
  );
}

export function DashboardMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="dashboard-metric">
      <span className="dashboard-metric-label">{label}</span>
      <span className="dashboard-metric-value">{value}</span>
    </div>
  );
}

export function DashboardBodyLayout({
  sidebar,
  main,
}: {
  sidebar: ReactNode;
  main: ReactNode;
}) {
  return (
    <div className="dashboard-two-column overview-layout">
      <aside className="overview-sidebar" aria-label="League coverage and quick lists">
        {sidebar}
      </aside>
      <div className="overview-main">{main}</div>
    </div>
  );
}

export function DashboardSection({
  title,
  titleId,
  lead,
  children,
  className = "",
}: {
  title: string;
  titleId: string;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`section-block ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <div className="overview-section-header">
        <h2 className="overview-section-title" id={titleId}>
          {title}
        </h2>
        {lead ? <p className="overview-section-lead">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}
