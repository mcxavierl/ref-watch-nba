export function refTrendSparklinePath(
  values: number[],
  width = 80,
  height = 24,
): string {
  if (values.length === 0) {
    const mid = height / 2;
    return `M0,${mid} L${width},${mid}`;
  }

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = Math.max(max - min, 1);
  const padding = 2;
  const innerHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? width / 2
        : (index / (values.length - 1)) * width;
    const normalized = (value - min) / range;
    const y = padding + innerHeight - normalized * innerHeight;
    return [x, y] as const;
  });

  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
}

export function RefTrendSparkline({
  values,
  tone = "neutral",
  width = 80,
  height = 24,
  className = "",
}: {
  values: number[];
  tone?: "positive" | "negative" | "neutral";
  width?: number;
  height?: number;
  className?: string;
}) {
  const path = refTrendSparklinePath(values, width, height);
  const last = values[values.length - 1] ?? 0;
  const lastY =
    values.length === 0
      ? height / 2
      : (() => {
          const min = Math.min(...values, 0);
          const max = Math.max(...values, 0);
          const range = Math.max(max - min, 1);
          const padding = 2;
          const innerHeight = height - padding * 2;
          const normalized = (last - min) / range;
          return padding + innerHeight - normalized * innerHeight;
        })();

  return (
    <svg
      className={`team-hub-sparkline team-hub-sparkline--${tone} ${className}`.trim()}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
    >
      <path className="team-hub-sparkline-line" d={path} />
      {values.length > 0 && (
        <circle
          className="team-hub-sparkline-dot"
          cx={width}
          cy={lastY}
          r="2"
        />
      )}
    </svg>
  );
}
