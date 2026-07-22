"use client";

import { useId, useMemo, useState } from "react";
import type {
  OfficiatingFingerprintAxis,
  OfficiatingFingerprintData,
} from "@/lib/analytics/officiating-fingerprint";
import "./officiating-fingerprint.css";

const AXIS_COUNT = 8;
const GRID_LEVELS = [25, 50, 75, 100];
const LABEL_PADDING = 56;
const CHART_SIZE = 272;
const VIEW_SIZE = CHART_SIZE + LABEL_PADDING * 2;
const CENTER = VIEW_SIZE / 2;
const MAX_RADIUS = 102;
const LABEL_RADIUS = 124;

type OfficiatingFingerprintProps = {
  data: OfficiatingFingerprintData;
  compact?: boolean;
  className?: string;
};

function axisAngle(index: number): number {
  return (Math.PI * 2 * index) / AXIS_COUNT - Math.PI / 2;
}

function pointAt(index: number, percentile: number): { x: number; y: number } {
  const angle = axisAngle(index);
  const radius = (percentile / 100) * MAX_RADIUS;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function polygonPoints(values: number[]): string {
  return values
    .map((value, index) => {
      const { x, y } = pointAt(index, value);
      return `${x},${y}`;
    })
    .join(" ");
}

function gridPolygon(level: number): string {
  return polygonPoints(Array.from({ length: AXIS_COUNT }, () => level));
}

function labelPoint(index: number): { x: number; y: number } {
  const angle = axisAngle(index);
  return {
    x: CENTER + LABEL_RADIUS * Math.cos(angle),
    y: CENTER + LABEL_RADIUS * Math.sin(angle),
  };
}

function labelPlacement(index: number): {
  textAnchor: "start" | "middle" | "end";
  dx: number;
  dy: number;
} {
  const angle = axisAngle(index);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  if (sin < -0.45) {
    return { textAnchor: "middle", dx: 0, dy: -5 };
  }
  if (sin > 0.45) {
    return { textAnchor: "middle", dx: 0, dy: 8 };
  }
  if (cos > 0.35) {
    return { textAnchor: "start", dx: 8, dy: 3 };
  }
  if (cos < -0.35) {
    return { textAnchor: "end", dx: -8, dy: 3 };
  }
  return { textAnchor: "middle", dx: 0, dy: 0 };
}

function ActiveTooltip({
  axis,
  index,
}: {
  axis: OfficiatingFingerprintAxis;
  index: number;
}) {
  const anchor = pointAt(index, Math.max(axis.percentile, 8));
  return (
    <div
      className="officiating-fingerprint-tooltip"
      style={{
        left: `${(anchor.x / VIEW_SIZE) * 100}%`,
        top: `${(anchor.y / VIEW_SIZE) * 100}%`,
      }}
      role="tooltip"
    >
      <p className="officiating-fingerprint-tooltip-title">{axis.label}</p>
      <p className="officiating-fingerprint-tooltip-copy">{axis.tooltip}</p>
    </div>
  );
}

export function OfficiatingFingerprint({
  data,
  compact = false,
  className = "",
}: OfficiatingFingerprintProps) {
  const titleId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dataPolygon = useMemo(
    () => polygonPoints(data.axes.map((axis) => axis.percentile)),
    [data.axes],
  );
  const leaguePolygon = useMemo(
    () =>
      polygonPoints(
        data.axes.map((axis) => axis.leagueAveragePercentile ?? 50),
      ),
    [data.axes],
  );

  return (
    <section
      className={`officiating-fingerprint ${compact ? "officiating-fingerprint--compact" : ""} ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <div className="officiating-fingerprint-header">
        <div>
          <p className="officiating-fingerprint-kicker">Ref-Intelligence Visual</p>
          <h2 className="officiating-fingerprint-title" id={titleId}>
            The Officiating Fingerprint
          </h2>
        </div>
        <p className="officiating-fingerprint-meta">
          {data.sampleGames.toLocaleString("en-US")} games · 0-100 percentile scale
        </p>
      </div>

      <div className="officiating-fingerprint-chart-wrap">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="officiating-fingerprint-chart"
          role="img"
          aria-label={`Officiating fingerprint for ${data.officialName}`}
        >
          {GRID_LEVELS.map((level) => (
            <polygon
              key={level}
              points={gridPolygon(level)}
              className="officiating-fingerprint-grid"
            />
          ))}

          {data.axes.map((axis, index) => {
            const outer = pointAt(index, 100);
            return (
              <line
                key={`${axis.id}-spoke`}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
                className="officiating-fingerprint-spoke"
              />
            );
          })}

          <polygon
            points={leaguePolygon}
            className="officiating-fingerprint-league"
          />

          <polygon points={dataPolygon} className="officiating-fingerprint-data" />

          {data.axes.map((axis, index) => {
            const point = pointAt(index, axis.percentile);
            const label = labelPoint(index);
            const placement = labelPlacement(index);
            const hitRadius = compact ? 10 : 12;

            return (
              <g key={axis.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hitRadius}
                  className="officiating-fingerprint-vertex-hit"
                  tabIndex={0}
                  role="button"
                  aria-label={axis.tooltip}
                  aria-pressed={activeIndex === index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  onClick={() =>
                    setActiveIndex((current) => (current === index ? null : index))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveIndex((current) => (current === index ? null : index));
                    }
                  }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={compact ? 4 : 5}
                  className="officiating-fingerprint-vertex"
                  aria-hidden
                  pointerEvents="none"
                />
                <text
                  x={label.x}
                  y={label.y}
                  dx={placement.dx}
                  dy={placement.dy}
                  textAnchor={placement.textAnchor}
                  dominantBaseline="middle"
                  className="officiating-fingerprint-label"
                >
                  {axis.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {activeIndex !== null ? (
          <ActiveTooltip axis={data.axes[activeIndex]!} index={activeIndex} />
        ) : null}
      </div>

      {!data.qualified ? (
        <p className="officiating-fingerprint-note">
          Preliminary fingerprint - sample still building toward the published gate.
        </p>
      ) : null}
    </section>
  );
}
