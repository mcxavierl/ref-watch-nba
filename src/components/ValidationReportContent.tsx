import Link from "next/link";
import {
  formatHitRate,
  formatRoiPct,
  loadValidationReport,
  type ValidationSignalReport,
} from "@/lib/validation-report";
import "@/components/validation-report.css";

function SignalReportSection({ report }: { report: ValidationSignalReport }) {
  return (
    <section className="validation-signal-section clinical-doc-section">
      <h2 className="validation-signal-title">{report.signal}</h2>
      <p className="validation-signal-summary">{report.summary}</p>
      <p className="validation-signal-methodology">{report.methodology}</p>

      <dl className="validation-exclusion-grid">
        <div>
          <dt>Synthetic / missing lines excluded</dt>
          <dd>{report.exclusions.syntheticLines.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Real-line games scored</dt>
          <dd>{report.realLineGames.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Break-even O/U at -110</dt>
          <dd>{formatHitRate(report.breakEvenRate)}</dd>
        </div>
      </dl>

      {report.realLineGames > 0 ? (
        <div className="validation-table-wrap">
          <table className="validation-table">
            <thead>
              <tr>
                <th scope="col">Bucket</th>
                <th scope="col" className="data-table-num">n</th>
                <th scope="col" className="data-table-num">O/U hit rate</th>
                <th scope="col" className="data-table-num">ATS hit rate</th>
                <th scope="col" className="data-table-num">ROI (-110)</th>
              </tr>
            </thead>
            <tbody>
              {report.buckets.map((bucket) => (
                <tr key={bucket.label}>
                  <td data-label="Bucket">{bucket.label}</td>
                  <td data-label="n" className="data-table-num tabular-nums">
                    {bucket.sampleSize}
                  </td>
                  <td data-label="O/U hit rate" className="data-table-num tabular-nums">
                    {formatHitRate(bucket.ouHitRate)}
                  </td>
                  <td data-label="ATS hit rate" className="data-table-num tabular-nums">
                    {formatHitRate(bucket.atsHitRate)}
                  </td>
                  <td data-label="ROI (-110)" className="data-table-num tabular-nums">
                    {formatRoiPct(bucket.roiPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="validation-empty-state">
          Backtest not scored yet. Populate external closing lines, then refresh validation (
          <code>npm run validation:refresh</code>). Requires{" "}
          <code>ODDS_API_KEY</code> for{" "}
          <code>npm run fetch-nba-historical-lines</code>.
        </p>
      )}
    </section>
  );
}

export function ValidationReportContent() {
  const report = loadValidationReport();
  const generated = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <section className="page-hero section-block">
        <h1 className="page-title">Closing-line validation</h1>
        <p className="page-lead">
          Walk-forward backtests against external closing totals and spreads. We publish
          results honestly, including when real-line coverage is incomplete. Not betting
          advice or live picks.
        </p>
        <p className="validation-meta">
          Last generated {generated}. {report.note}
        </p>
      </section>

      <SignalReportSection report={report.nbaWhistlePremium} />
      <SignalReportSection report={report.nhlPpPremium} />

      <section className="validation-caveats clinical-doc-section">
        <h2 className="validation-signal-title">Caveats</h2>
        <ul>
          <li>Signals are historical associations, not live recommendations.</li>
          <li>
            Walk-forward design prevents lookahead within ref histories; it does not account
            for roster, rule, or scheduling changes.
          </li>
          <li>Synthetic lines are excluded, not fabricated into hit rates.</li>
        </ul>
        <p>
          <Link href="/methodology" className="trust-charter-link">
            Methodology and sample gates
          </Link>
          {" · "}
          <Link href="/about" className="trust-charter-link">
            About RefWatch
          </Link>
        </p>
      </section>
    </>
  );
}
