import { PrefetchLink } from "@/components/PrefetchLink";
import { CompareDualGsniGauge } from "@/components/compare/CompareDualGsniGauge";
import {
  CompareDualLeagueSignal,
  CompareLeagueSignalBar,
} from "@/components/compare/CompareLeagueSignalBar";
import { RefAvatar } from "@/components/RefAvatar";
import { RefJerseyNumber } from "@/components/RefJerseyNumber";
import {
  buildCompareLeagueMetrics,
  buildCompareMetricRows,
  CROSS_LEAGUE_COMPARE_DISCLAIMER,
  type CompareMetricRow,
  type CompareRefBundle,
} from "@/lib/ref-compare";
import { COMPARE_GHOST_METRIC_ROWS } from "@/lib/ref-compare-client";
import type { LeagueId } from "@/lib/leagues";
import { semanticImpactTextClass } from "@/lib/semantic-impact";

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
          <PrefetchLink
            href={`${bundle.config.pathPrefix}/refs/${bundle.profile.slug}`}
            prefetch={true}
          >
            {bundle.profile.name}
          </PrefetchLink>
        </h2>
        <p className="ref-compare-header-meta">
          <span className="ref-compare-league-badge">{bundle.config.shortLabel}</span>
          <RefJerseyNumber
            number={bundle.profile.number}
            className="font-tabular text-sm text-slate-400"
          />
          <span className="text-slate-400">· {bundle.scopeLabel}</span>
        </p>
      </div>
    </div>
  );
}

function MetricValueCell({
  value,
  detail,
  detailDelta,
  sampleGames,
}: {
  value: string;
  detail?: string;
  detailDelta?: number;
  sampleGames?: number;
}) {
  const detailClass =
    detailDelta !== undefined
      ? semanticImpactTextClass(detailDelta, { sampleGames })
      : "text-slate-400";

  return (
    <>
      <span className="ref-compare-value">{value}</span>
      {detail ? (
        <span className={`ref-compare-detail ${detailClass}`.trim()}>{detail}</span>
      ) : null}
    </>
  );
}

function CompareMetricRowDesktop({
  row,
  leftName,
  rightName,
}: {
  row: CompareMetricRow;
  leftName: string;
  rightName: string;
}) {
  if (row.kind === "disclaimer") {
    return (
      <tr className="ref-compare-disclaimer-row">
        <td colSpan={3} className="ref-compare-disclaimer-cell">
          {CROSS_LEAGUE_COMPARE_DISCLAIMER}
        </td>
      </tr>
    );
  }

  if (row.kind === "gsni") {
    return (
      <tr key={row.id} className="ref-compare-gsni-row">
        <th scope="row">
          <span>{row.label}</span>
          <span className="ref-compare-metric-hint">Shared whistle-bias axis</span>
        </th>
        <td colSpan={2}>
          <CompareDualGsniGauge
            scoreA={row.gsniA}
            scoreB={row.gsniB}
            labelA={leftName}
            labelB={rightName}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr key={row.id}>
      <th scope="row">
        <span>{row.label}</span>
        <CompareDualLeagueSignal
          signalA={row.signalA}
          signalB={row.signalB}
          className="ref-compare-signal-dual--inline"
        />
      </th>
      <td>
        <MetricValueCell
          value={row.valueA}
          detail={row.detailA}
          detailDelta={row.detailDeltaA}
          sampleGames={row.sampleGamesA}
        />
        <CompareLeagueSignalBar signal={row.signalA} tone="a" className="ref-compare-signal--cell" />
      </td>
      <td>
        <MetricValueCell
          value={row.valueB}
          detail={row.detailB}
          detailDelta={row.detailDeltaB}
          sampleGames={row.sampleGamesB}
        />
        <CompareLeagueSignalBar signal={row.signalB} tone="b" className="ref-compare-signal--cell" />
      </td>
    </tr>
  );
}

function CompareMetricRowVersus({
  row,
  leftName,
  rightName,
}: {
  row: CompareMetricRow;
  leftName: string;
  rightName: string;
}) {
  if (row.kind === "disclaimer") {
    return (
      <p className="ref-compare-versus-disclaimer">{CROSS_LEAGUE_COMPARE_DISCLAIMER}</p>
    );
  }

  if (row.kind === "gsni") {
    return (
      <article className="ref-compare-versus-row ref-compare-versus-row--gsni">
        <div className="ref-compare-versus-center ref-compare-versus-center--full">
          <p className="ref-compare-versus-label">{row.label}</p>
          <CompareDualGsniGauge
            scoreA={row.gsniA}
            scoreB={row.gsniB}
            labelA={leftName}
            labelB={rightName}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="ref-compare-versus-row">
      <div className="ref-compare-versus-side ref-compare-versus-side--a">
        <span className="ref-compare-versus-side-label">Official A</span>
        <MetricValueCell
          value={row.valueA}
          detail={row.detailA}
          detailDelta={row.detailDeltaA}
          sampleGames={row.sampleGamesA}
        />
        <CompareLeagueSignalBar signal={row.signalA} tone="a" />
      </div>

      <div className="ref-compare-versus-center">
        <p className="ref-compare-versus-label">{row.label}</p>
        <CompareDualLeagueSignal signalA={row.signalA} signalB={row.signalB} />
      </div>

      <div className="ref-compare-versus-side ref-compare-versus-side--b">
        <span className="ref-compare-versus-side-label">Official B</span>
        <MetricValueCell
          value={row.valueB}
          detail={row.detailB}
          detailDelta={row.detailDeltaB}
          sampleGames={row.sampleGamesB}
        />
        <CompareLeagueSignalBar signal={row.signalB} tone="b" />
      </div>
    </article>
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
    <div className="ref-compare-view ref-compare-view--ghost rounded-xl border border-slate-800 bg-slate-900 overflow-hidden p-0">
      {(left || right) && (
        <div className="ref-compare-columns">
          {left ? <CompareRefHeader bundle={left} /> : <div aria-hidden />}
          {right ? <CompareRefHeader bundle={right} /> : <div aria-hidden />}
        </div>
      )}

      <div className="ref-compare-table-wrap hidden md:block overflow-x-auto">
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

function CompareResults({
  left,
  right,
  rows,
  crossLeague,
}: {
  left: CompareRefBundle;
  right: CompareRefBundle;
  rows: CompareMetricRow[];
  crossLeague: boolean;
}) {
  const leftName = left.profile.name;
  const rightName = right.profile.name;

  return (
    <div className="ref-compare-view rounded-xl border border-slate-800 bg-slate-900 overflow-hidden p-0">
      <div className="ref-compare-columns">
        <CompareRefHeader bundle={left} />
        <CompareRefHeader bundle={right} />
      </div>

      <div className="ref-compare-versus md:hidden">
        {rows.map((row) => (
          <CompareMetricRowVersus
            key={row.id}
            row={row}
            leftName={leftName}
            rightName={rightName}
          />
        ))}
      </div>

      <div className="ref-compare-table-wrap hidden md:block overflow-x-auto">
        <table className="ref-compare-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">{leftName}</th>
              <th scope="col">{rightName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CompareMetricRowDesktop
                key={row.id}
                row={row}
                leftName={leftName}
                rightName={rightName}
              />
            ))}
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
    <CompareResults
      left={left}
      right={right}
      rows={rows}
      crossLeague={crossLeague}
    />
  );
}

export function ComparePageSkeleton() {
  return (
    <div className="ref-compare-page" aria-busy="true" aria-label="Loading compare controls">
      <div className="ref-compare-controls cls-skeleton-compare-controls" aria-hidden>
        <div className="cls-skeleton-panel cls-skeleton-compare-picker" />
        <div className="cls-skeleton-panel cls-skeleton-compare-picker" />
      </div>
      <CompareGhostTable crossLeague={false} />
    </div>
  );
}
