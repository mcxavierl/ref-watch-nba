function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type CompareLeagueSignalBarProps = {
  /** Normalized league-relative signal in [-1, 1]. 0 = league average. */
  signal: number | null | undefined;
  tone?: "a" | "b";
  className?: string;
};

/** Tiny league-relative bar: center tick = league average, dot = official delta. */
export function CompareLeagueSignalBar({
  signal,
  tone = "a",
  className = "",
}: CompareLeagueSignalBarProps) {
  if (signal === null || signal === undefined || !Number.isFinite(signal)) {
    return (
      <span
        className={`ref-compare-signal ref-compare-signal--empty ${className}`.trim()}
        aria-hidden
      />
    );
  }

  const clamped = clamp(signal, -1, 1);
  const markerPercent = ((clamped + 1) / 2) * 100;

  return (
    <span
      className={`ref-compare-signal ref-compare-signal--${tone} ${className}`.trim()}
      role="img"
      aria-label={`${clamped >= 0 ? "above" : "below"} league average`}
    >
      <span className="ref-compare-signal-rail" aria-hidden>
        <span className="ref-compare-signal-center" />
        <span
          className="ref-compare-signal-marker"
          style={{ left: `${markerPercent}%` }}
        />
      </span>
    </span>
  );
}

type CompareDualLeagueSignalProps = {
  signalA: number | null | undefined;
  signalB: number | null | undefined;
  className?: string;
};

/** Stacked A/B league signal bars for the versus center column. */
export function CompareDualLeagueSignal({
  signalA,
  signalB,
  className = "",
}: CompareDualLeagueSignalProps) {
  return (
    <span className={`ref-compare-signal-dual ${className}`.trim()}>
      <CompareLeagueSignalBar signal={signalA} tone="a" />
      <CompareLeagueSignalBar signal={signalB} tone="b" />
    </span>
  );
}
