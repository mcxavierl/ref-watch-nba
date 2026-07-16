"use client";

import type { PreviewSparklinePoint } from "@/lib/ref-profile-preview";

type RefProfilePreviewSparklineProps = {
  points: PreviewSparklinePoint[];
  leagueAvg?: number;
  unitLabel: string;
  className?: string;
};

export function RefProfilePreviewSparkline({
  points,
  leagueAvg,
  unitLabel,
  className = "",
}: RefProfilePreviewSparklineProps) {
  if (points.length === 0) {
    return (
      <p className="ref-preview-sparkline-empty m-0 text-xs text-primary-muted">
        Not enough recent games for a volatility sparkline.
      </p>
    );
  }

  const width = 240;
  const height = 56;
  const padX = 8;
  const padY = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(...values, leagueAvg ?? values[0] ?? 0);
  const max = Math.max(...values, leagueAvg ?? values[0] ?? 0);
  const span = max - min || 1;

  const coords = points.map((point, index) => {
    const x =
      padX +
      (index / Math.max(1, points.length - 1)) * (width - padX * 2);
    const y =
      height -
      padY -
      ((point.value - min) / span) * (height - padY * 2);
    return { x, y, point };
  });

  const polyline = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const avgY =
    leagueAvg !== undefined
      ? height -
        padY -
        ((leagueAvg - min) / span) * (height - padY * 2)
      : null;

  return (
    <div className={`ref-preview-sparkline ${className}`.trim()}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${unitLabel} sparkline for last ${points.length} games`}
        className="ref-preview-sparkline-svg"
      >
        {avgY !== null ? (
          <line
            x1={padX}
            x2={width - padX}
            y1={avgY}
            y2={avgY}
            stroke="rgb(161 161 170 / 0.55)"
            strokeDasharray="4 3"
            strokeWidth={1}
          />
        ) : null}
        <polyline
          fill="none"
          stroke="rgb(212 212 216)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
        {coords.map(({ x, y, point }) => (
          <circle
            key={point.gameId}
            cx={x}
            cy={y}
            r={3}
            fill="rgb(244 244 245)"
            stroke="rgb(161 161 170)"
            strokeWidth={1}
          >
            <title>{`${point.label}: ${point.value} ${unitLabel}`}</title>
          </circle>
        ))}
      </svg>
      <ul className="ref-preview-sparkline-legend">
        {points.map((point) => (
          <li key={point.gameId} className="tabular-nums">
            <span className="ref-preview-sparkline-legend-value">{point.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
