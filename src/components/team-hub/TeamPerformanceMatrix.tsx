import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { RefAvatar } from "@/components/RefAvatar";
import { RefTrendSparkline } from "@/components/team-hub/RefTrendSparkline";
import { formatPct, formatSigned } from "@/lib/stats-utils";
import type {
  RefPerformanceRow,
  TeamPerformanceMatrix,
} from "@/lib/team-insight-hub";

function sparklineTone(
  deltaPts: number,
): "positive" | "negative" | "neutral" {
  if (deltaPts >= 5) return "positive";
  if (deltaPts <= -5) return "negative";
  return "neutral";
}

function RefMatrixRow({
  row,
  basePath,
  sport,
}: {
  row: RefPerformanceRow;
  basePath: string;
  sport: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
}) {
  const tone = sparklineTone(row.deltaPts);

  return (
    <li className="team-hub-matrix-row">
      <Link
        href={`${basePath}/refs/${row.slug}`}
        className="team-hub-matrix-row-link"
      >
        <RefAvatar
          name={row.name}
          slug={row.slug}
          sport={sport}
          size="sm"
        />
        <div className="team-hub-matrix-row-copy">
          <p className="team-hub-matrix-ref-name">{row.name}</p>
          <p className="team-hub-matrix-ref-meta">
            {formatPct(row.winRate)} · {row.games} gp ·{" "}
            {formatSigned(row.deltaPts)} pts
          </p>
        </div>
        <RefTrendSparkline values={row.sparkline} tone={tone} />
      </Link>
    </li>
  );
}

function RefMatrixGroup({
  title,
  rows,
  basePath,
  sport,
}: {
  title: string;
  rows: RefPerformanceRow[];
  basePath: string;
  sport: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
}) {
  if (rows.length === 0) return null;

  return (
    <div className="team-hub-matrix-group">
      <h3 className="team-hub-matrix-group-title">{title}</h3>
      <ul className="team-hub-matrix-list">
        {rows.map((row) => (
          <RefMatrixRow
            key={row.slug}
            row={row}
            basePath={basePath}
            sport={sport}
          />
        ))}
      </ul>
    </div>
  );
}

export function TeamPerformanceMatrix({
  matrix,
  teamLabel,
  basePath = "",
  sport = "nba",
}: {
  matrix: TeamPerformanceMatrix;
  teamLabel: string;
  basePath?: string;
  sport?: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
}) {
  const totalRows =
    matrix.highCorrelation.length + matrix.neutralCorrelation.length;

  if (totalRows === 0) {
    return (
      <section className="team-hub-matrix">
        <h2 className="team-hub-section-title">Referee performance matrix</h2>
        <p className="team-hub-empty">
          Not enough qualified ref samples for {teamLabel} yet. Expand the season
          scope or check back after the next ingest cycle.
        </p>
      </section>
    );
  }

  return (
    <section className="team-hub-matrix">
      <h2 className="team-hub-section-title">Referee performance matrix</h2>
      <p className="team-hub-section-lead">
        Officials grouped by correlation with {teamLabel} outcomes. Sparklines
        show cumulative edge over the last 10 games.
      </p>

      <RefMatrixGroup
        title="High correlation"
        rows={matrix.highCorrelation}
        basePath={basePath}
        sport={sport}
      />
      <RefMatrixGroup
        title="Neutral / low correlation"
        rows={matrix.neutralCorrelation}
        basePath={basePath}
        sport={sport}
      />
    </section>
  );
}
