import Link from "next/link";
import { RefAvatar } from "@/components/RefAvatar";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
import {
  buildCompareLeagueMetrics,
  buildCompareMetricRows,
  CROSS_LEAGUE_COMPARE_DISCLAIMER,
  type CompareRefBundle,
} from "@/lib/ref-compare";
import { COMPARE_GHOST_METRIC_ROWS } from "@/lib/ref-compare-client";
import type { LeagueId } from "@/lib/leagues";

function sportForLeague(leagueId: LeagueId) {
  if (leagueId === "nba") return "nba" as const;
  if (leagueId === "nhl") return "nhl" as const;
  if (leagueId === "nfl") return "nfl" as const;
  if (leagueId === "epl") return "epl" as const;
  if (leagueId === "laliga") return "laliga" as const;
  if (leagueId === "cbb") return "cbb" as const;
  return "cfb" as const;
}

function CompareRefHeader({ bundle }: { bundle: CompareRefBundle }) {
  const sport = sportForLeague(bundle.leagueId);
  return (
    <div className="ref-compare-header">
      <RefAvatar
        name={bundle.profile.name}
        slug={bundle.profile.slug}
        sport={sport}
        size="lg"
        decorative={false}
      />
      <div className="ref-compare-header-copy">
        <h2 className="ref-compare-header-name">
          <Link href={`${bundle.config.pathPrefix}/refs/${bundle.profile.slug}`}>
            {bundle.profile.name}
          </Link>
        </h2>
        <p className="ref-compare-header-meta">
          <span className="ref-compare-league-badge">{bundle.config.shortLabel}</span>
          <RefJerseyNumber
            number={bundle.profile.number}
            className="font-tabular text-sm text-zinc-500"
          />
          <span className="text-zinc-500">· {bundle.scopeLabel}</span>
        </p>
      </div>
    </div>
  );
}

function LeagueMetricList({
  bundle,
  title,
}: {
  bundle: CompareRefBundle;
  title: string;
}) {
  const metrics = buildCompareLeagueMetrics(bundle);

  return (
    <div className="ref-compare-league-metrics">
      <h3 className="ref-compare-league-metrics-title">{title}</h3>
      <ul className="ref-compare-league-metrics-list">
        {metrics.map((metric) => (
          <li key={metric.id} className="ref-compare-league-metrics-item">
            <span className="ref-compare-league-metrics-label">{metric.label}</span>
            <span className="ref-compare-value">{metric.value}</span>
            {metric.detail ? (
              <span className="ref-compare-detail">{metric.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompareGhostTable({
  crossLeague,
  left,
  right,
}: {
  crossLeague?: boolean;
  left?: CompareRefBundle | null;
  right?: CompareRefBundle | null;
}) {
  const leftName = left?.profile.name ?? "Official A";
  const rightName = right?.profile.name ?? "Official B";

  return (
    <div className="ref-compare-view ref-compare-view--ghost ref-profile-section overflow-hidden p-0">
      {(left || right) && (
        <div className="ref-compare-columns">
          {left ? <CompareRefHeader bundle={left} /> : <div aria-hidden />}
          {right ? <CompareRefHeader bundle={right} /> : <div aria-hidden />}
        </div>
      )}

      <div className="ref-compare-table-wrap overflow-x-auto">
        <table className="ref-compare-table ref-compare-table--ghost">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">{leftName}</th>
              <th scope="col">{rightName}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_GHOST_METRIC_ROWS.map((label) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>
                  <span className="ref-compare-ghost-cell" aria-hidden />
                </td>
                <td>
                  <span className="ref-compare-ghost-cell" aria-hidden />
                </td>
              </tr>
            ))}
            {crossLeague ? (
              <tr className="ref-compare-disclaimer-row">
                <td colSpan={3} className="ref-compare-disclaimer-cell">
                  {CROSS_LEAGUE_COMPARE_DISCLAIMER}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RefCompareView({
  left,
  right,
  crossLeagueHint = false,
  loading = false,
}: {
  left: CompareRefBundle | null;
  right: CompareRefBundle | null;
  crossLeagueHint?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <CompareGhostTable
        crossLeague={crossLeagueHint}
        left={left}
        right={right}
      />
    );
  }

  if (!left && !right) {
    return <CompareGhostTable crossLeague={false} />;
  }

  if (!left || !right) {
    const single = left ?? right;
    if (!single) return <CompareGhostTable crossLeague={false} />;
    return (
      <CompareGhostTable
        crossLeague={crossLeagueHint}
        left={left}
        right={right}
      />
    );
  }

  const crossLeague = left.leagueId !== right.leagueId;
  const rows = buildCompareMetricRows(left, right);

  return (
    <div className="ref-compare-view ref-profile-section overflow-hidden p-0">
      <div className="ref-compare-columns">
        <CompareRefHeader bundle={left} />
        <CompareRefHeader bundle={right} />
      </div>

      <div className="ref-compare-table-wrap overflow-x-auto">
        <table className="ref-compare-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">{left.profile.name}</th>
              <th scope="col">{right.profile.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.kind === "disclaimer" ? (
                <tr key={row.id} className="ref-compare-disclaimer-row">
                  <td colSpan={3} className="ref-compare-disclaimer-cell">
                    {CROSS_LEAGUE_COMPARE_DISCLAIMER}
                  </td>
                </tr>
              ) : (
                <tr key={row.id}>
                  <th scope="row">{row.label}</th>
                  <td>
                    <span className="ref-compare-value">{row.valueA}</span>
                    {row.detailA ? (
                      <span className="ref-compare-detail">{row.detailA}</span>
                    ) : null}
                  </td>
                  <td>
                    <span className="ref-compare-value">{row.valueB}</span>
                    {row.detailB ? (
                      <span className="ref-compare-detail">{row.detailB}</span>
                    ) : null}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {crossLeague ? (
        <div className="ref-compare-league-metrics-grid px-4 py-4 sm:px-5">
          <LeagueMetricList
            bundle={left}
            title={`${left.config.shortLabel} metrics · ${left.profile.name}`}
          />
          <LeagueMetricList
            bundle={right}
            title={`${right.config.shortLabel} metrics · ${right.profile.name}`}
          />
        </div>
      ) : null}
    </div>
  );
}
