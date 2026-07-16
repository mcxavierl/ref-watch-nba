"use client";

import { MetricInfoHint } from "@/components/shared/MetricInfoHint";
import {
  oiiMethodologyTooltip,
  type OiiComponents,
  type OiiGenerationResult,
} from "@/lib/officiating-intelligence-index";

type OiiRadialGaugeProps = {
  result: Extract<OiiGenerationResult, { status: "ok" }>;
  size?: "sm" | "md" | "lg";
  className?: string;
};

function gaugeDimensions(size: OiiRadialGaugeProps["size"]) {
  if (size === "lg") return { box: 120, stroke: 9, font: "1.75rem" };
  if (size === "sm") return { box: 88, stroke: 7, font: "1.25rem" };
  return { box: 104, stroke: 8, font: "1.5rem" };
}

function arcStroke(score: number, radius: number): number {
  const circumference = 2 * Math.PI * radius;
  return (Math.max(0, Math.min(100, score)) / 100) * circumference;
}

export function OiiRadialGauge({
  result,
  size = "md",
  className = "",
}: OiiRadialGaugeProps) {
  const { box, stroke, font } = gaugeDimensions(size);
  const radius = (box - stroke) / 2 - 2;
  const center = box / 2;
  const dash = arcStroke(result.score, radius);
  const circumference = 2 * Math.PI * radius;
  const methodology = oiiMethodologyTooltip(result.components, result.weights);

  return (
    <div
      className={`oii-radial-gauge rounded-xl border border-border/70 bg-surface/95 p-3 ${className}`.trim()}
      data-oii-score={result.score}
      aria-label={`Officiating Intelligence Index ${result.score} out of 100.`}
    >
      <div className="flex items-start justify-between gap-3">
        <MetricInfoHint hint={methodology} className="oii-radial-gauge-label-wrap">
          <p className="oii-radial-gauge-label m-0 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            OII
            <span className="oii-radial-gauge-methodology-mark ml-1 text-[0.62rem] font-medium normal-case tracking-normal text-zinc-500">
              methodology
            </span>
          </p>
        </MetricInfoHint>
        <span className="text-[0.62rem] font-medium uppercase tracking-wide text-zinc-500">
          Predictability gauge
        </span>
      </div>

      <div className="mt-2 flex items-center justify-center">
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          role="img"
          aria-hidden
          className="oii-radial-gauge-svg"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgb(39 39 42 / 0.85)"
            strokeWidth={stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#oiiGaugeGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
          <defs>
            <linearGradient id="oiiGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="55%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-zinc-100 font-bold tabular-nums"
            style={{ fontSize: font }}
          >
            {result.score}
          </text>
        </svg>
      </div>

      <OiiComponentFootnote components={result.components} />
    </div>
  );
}

function OiiComponentFootnote({ components }: { components: OiiComponents }) {
  return (
    <p className="oii-radial-gauge-footnote m-0 mt-2 text-center text-[0.65rem] leading-snug text-zinc-500">
      Vol {Math.round(components.volatilityScore)} · Leverage{" "}
      {Math.round(components.highLeverageScore)} · Confidence{" "}
      {Math.round(components.sampleConfidenceScore)}
    </p>
  );
}

type OiiInsufficientProps = {
  sampleSize: number;
  className?: string;
};

export function OiiInsufficientBadge({
  sampleSize,
  className = "",
}: OiiInsufficientProps) {
  const methodology = oiiMethodologyTooltip();
  return (
    <div
      className={`oii-insufficient rounded-xl border border-dashed border-border/80 bg-surface/70 p-3 ${className}`.trim()}
    >
      <MetricInfoHint hint={methodology}>
        <p className="m-0 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
          OII
          <span className="ml-1 text-[0.62rem] font-medium normal-case tracking-normal">
            methodology
          </span>
        </p>
      </MetricInfoHint>
      <p className="oii-insufficient-value m-0 mt-2 text-sm font-semibold tabular-nums text-zinc-400">
        N/A - Insufficient Data
      </p>
      <p className="m-0 mt-1 text-xs text-zinc-500">
        {sampleSize} games logged; minimum 10 required.
      </p>
    </div>
  );
}
