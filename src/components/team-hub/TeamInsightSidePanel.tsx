import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { RefTrendSparkline } from "@/components/team-hub/RefTrendSparkline";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type { NextGameWatch, QuickAlert } from "@/lib/team-insight-hub";

function alertTone(severity: QuickAlert["severity"]): string {
  if (severity === "high") return "team-hub-alert--high";
  if (severity === "medium") return "team-hub-alert--medium";
  return "team-hub-alert--low";
}

export function TeamInsightSidePanel({
  nextGameWatch,
  quickAlerts,
  basePath = "",
}: {
  nextGameWatch: NextGameWatch | null;
  quickAlerts: QuickAlert[];
  basePath?: string;
}) {
  if (!nextGameWatch && quickAlerts.length === 0) return null;

  return (
    <aside className="team-hub-aside" aria-label="Actionable insights">
      {nextGameWatch && (
        <section className="team-hub-aside-card">
          <p className="team-hub-eyebrow">Next game watch</p>
          <h2 className="team-hub-aside-title">{nextGameWatch.matchup}</h2>
          <p className="team-hub-aside-meta">
            {nextGameWatch.status === "live" ? "Crew assigned" : "Scheduled"} ·{" "}
            {nextGameWatch.slateDate}
          </p>

          <div className="team-hub-watch-ref">
            {nextGameWatch.headRefSlug ? (
              <Link
                href={`${basePath}/refs/${nextGameWatch.headRefSlug}`}
                className="team-hub-watch-ref-name"
              >
                {nextGameWatch.headRefName}
              </Link>
            ) : (
              <p className="team-hub-watch-ref-name">
                {nextGameWatch.headRefName}
              </p>
            )}
            <p className="team-hub-watch-ref-trend">
              {nextGameWatch.trendSummary}
            </p>
            {nextGameWatch.winRate !== null && (
              <p className="team-hub-watch-ref-stat">
                {formatPct(nextGameWatch.winRate)} ·{" "}
                {formatSigned(nextGameWatch.deltaPts ?? 0)} pts vs baseline
              </p>
            )}
            <RefTrendSparkline
              values={nextGameWatch.sparkline}
              tone={
                (nextGameWatch.deltaPts ?? 0) >= 5
                  ? "positive"
                  : (nextGameWatch.deltaPts ?? 0) <= -5
                    ? "negative"
                    : "neutral"
              }
              width={120}
              height={28}
              className="team-hub-watch-sparkline"
            />
          </div>
        </section>
      )}

      {quickAlerts.length > 0 && (
        <section className="team-hub-aside-card">
          <p className="team-hub-eyebrow">Quick alerts</p>
          <ul className="team-hub-alert-list">
            {quickAlerts.map((alert) => (
              <li
                key={alert.id}
                className={`team-hub-alert ${alertTone(alert.severity)}`}
              >
                <p className="team-hub-alert-title">{alert.title}</p>
                <p className="team-hub-alert-body">{alert.body}</p>
                {alert.refSlug && (
                  <Link
                    href={`${basePath}/refs/${alert.refSlug}`}
                    className="team-hub-alert-link"
                  >
                    View ref →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
