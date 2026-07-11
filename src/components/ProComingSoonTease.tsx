export function ProComingSoonTease({
  league: _league,
  compact = false,
  callout = false,
}: {
  league?: "NBA" | "NHL" | "NFL" | "EPL" | "LALIGA" | "CBB" | "CFB";
  compact?: boolean;
  callout?: boolean;
}) {
  if (callout) {
    return (
      <aside className="pro-tease-callout" aria-label="Ref Watch Pro preview">
        <div className="pro-tease-callout-inner">
          <p className="pro-tease-callout-kicker">Ref Watch Pro</p>
          <p className="pro-tease-callout-title">Coming soon</p>
          <p className="pro-tease-callout-copy">
            Automated slate alerts, deeper crew reunion stats, and expanded
            officiating intelligence feeds.
          </p>
        </div>
      </aside>
    );
  }

  if (compact) {
    return (
      <p className="text-sm leading-relaxed text-zinc-600">
        <span className="font-semibold text-zinc-800">Ref Watch Pro</span>{" "}
        (coming soon), automated slate alerts, deeper crew reunion stats, and
        expanded officiating intelligence feeds.
      </p>
    );
  }

  return (
    <div className="pro-tease panel-inset mt-8 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900">Ref Watch Pro, coming soon</p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
            Slate alerts before puck drop or tip-off, reunion-level crew stats,
            and richer signal digests, built on the same sample gates you see
            today.
          </p>
          <ul className="pro-tease-features mt-3 space-y-1.5 text-sm text-zinc-600">
            <li>Email when tonight&apos;s standout officiating signals post</li>
            <li>Historical tendency vs crew benchmark context</li>
            <li>Exact crew reunion history across seasons</li>
          </ul>
        </div>
        <div className="pro-tease-preview shrink-0" aria-hidden>
          <div className="pro-tease-blur rounded-md border border-border bg-surface px-4 py-3">
            <p className="text-xs font-semibold text-zinc-400">Pro preview</p>
            <p className="mt-2 font-mono text-sm tabular-nums text-zinc-300">
              +4.2% vs baseline · reunion n=12
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-zinc-300">
              Moderate confidence · 187 games
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
