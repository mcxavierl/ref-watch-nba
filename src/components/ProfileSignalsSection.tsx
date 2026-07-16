import Link from "next/link";
import type { ProfileSignal, ProfileSignalsBundle } from "@/lib/profile-signals";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { ProvenanceIndicator } from "@/components/hub/ProvenanceIndicator";
import { StandoutMetricValue } from "@/components/StandoutMetric";
import { researchHubHref, type FindingLeague } from "@/lib/findings-shared";
import { findingStatDelightTone, isLeagueBaselineComparisonStat } from "@/lib/metric-delight";
import { NO_SIGNAL_COPY, SIGNAL_LIMITATION_COPY } from "@/lib/trust-charter";

/**
 * CLINICAL MODERN STANDARD: High-accuracy data visualization. All volatility-prone
 * metrics must display maturity indicators and adjusted projections.
 */

const KEY_SIGNAL_KINDS = new Set<ProfileSignal["kind"]>([
  "scoring-delta",
  "whistle-delta",
]);

function keyFindingLabel(signal: ProfileSignal): string {
  if (signal.kind === "scoring-delta") return "Scoring outlier";
  if (signal.kind === "whistle-delta") return "Whistle extreme";
  return signal.headline;
}

function profileStatToneClass(label: string, value: string, detail?: string) {
  const stat = { label, value, detail };
  if (isLeagueBaselineComparisonStat(stat)) {
    return "profile-signal-stat profile-signal-stat--neutral";
  }
  const tone = findingStatDelightTone(stat);
  if (tone === "positive" || tone === "standout-high") {
    return "profile-signal-stat profile-signal-stat--positive";
  }
  if (tone === "negative" || tone === "standout-low") {
    return "profile-signal-stat profile-signal-stat--negative";
  }
  return "profile-signal-stat";
}

function SignalStats({ stats }: { stats: ProfileSignal["stats"] }) {
  if (stats.length === 0) return null;

  return (
    <dl className="mt-3 grid gap-2">
      {stats.map((stat) => {
        const tone = findingStatDelightTone(stat);
        const neutralBaseline = isLeagueBaselineComparisonStat(stat);
        return (
          <div
            key={stat.label}
            className={profileStatToneClass(stat.label, stat.value, stat.detail)}
          >
            <dt className="text-xs font-normal text-slate-400">{stat.label}</dt>
            <dd className="mt-0.5">
              <StandoutMetricValue
                tone={neutralBaseline ? "neutral" : tone}
                size="md"
              >
                {stat.value}
              </StandoutMetricValue>
            </dd>
            {stat.detail && (
              <dd className="mt-0.5 text-xs text-primary-muted tabular-nums">
                {stat.detail}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

function SignalCard({
  signal,
  variant,
  showKeyLabel = false,
}: {
  signal: ProfileSignal;
  variant: "full" | "sidebar";
  showKeyLabel?: boolean;
}) {
  const titleClass =
    variant === "sidebar"
      ? "min-w-0 flex-1 text-sm font-semibold text-zinc-900"
      : "min-w-0 flex-1 text-base font-semibold text-zinc-900";
  const bodyClass =
    variant === "sidebar"
      ? "mt-2 text-xs leading-relaxed text-zinc-600"
      : "mt-2 text-sm leading-relaxed text-zinc-600";

  return (
    <div>
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        <h3 className={titleClass}>
          {showKeyLabel ? keyFindingLabel(signal) : signal.headline}
        </h3>
        {signal.notable && (
          <StatusBadge
            verdict="caution"
            label="Notable"
            compact
            className="profile-signal-badge"
          />
        )}
      </div>
      <p className={bodyClass}>{signal.body}</p>
      <SignalStats stats={signal.stats} />
    </div>
  );
}

function ProgressiveSignalList({
  signals,
  variant,
}: {
  signals: ProfileSignal[];
  variant: "full" | "sidebar";
}) {
  const keySignals = signals.filter(
    (signal) => KEY_SIGNAL_KINDS.has(signal.kind) && signal.notable,
  );
  const secondarySignals = signals.filter(
    (signal) => !(KEY_SIGNAL_KINDS.has(signal.kind) && signal.notable),
  );

  const paddingClass = variant === "sidebar" ? "px-4 py-4 sm:px-5" : "px-4 py-5 sm:px-5";

  return (
    <>
      {keySignals.length > 0 && (
        <ul className="divide-y divide-border-subtle">
          {keySignals.map((signal) => (
            <li key={signal.kind} className={paddingClass}>
              <SignalCard signal={signal} variant={variant} showKeyLabel />
            </li>
          ))}
        </ul>
      )}

      {secondarySignals.length > 0 && (
        <details className="profile-signals-details border-t border-border-subtle">
          <summary className={`profile-signals-details-summary ${paddingClass}`}>
            {secondarySignals.length} more signal
            {secondarySignals.length === 1 ? "" : "s"}
          </summary>
          <ul className="divide-y divide-border-subtle border-t border-border-subtle">
            {secondarySignals.map((signal) => (
              <li key={signal.kind} className={paddingClass}>
                <SignalCard signal={signal} variant={variant} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export function ProfileSignalsSection({
  bundle,
  refName,
  variant = "full",
  league = "NBA",
  lastUpdated,
}: {
  bundle: ProfileSignalsBundle;
  refName: string;
  lastUpdated?: string;
  variant?: "full" | "sidebar";
  league?: FindingLeague;
}) {
  const seeded = bundle.dataSource === "seeded";
  const isEmpty = bundle.signals.length === 0;

  if (variant === "sidebar") {
    return (
      <aside id="profile-signals" className="ref-signals-sidebar clinical-card">
        <div className="border-b border-border-subtle px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-800">Profile signals</h2>
            <ProvenanceIndicator
              sampleSize={bundle.sampleGate.sampleSize}
              lastUpdated={lastUpdated}
              source={`${bundle.sampleGames} games logged`}
            />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-primary-muted">
            Data-led patterns, informational only.
          </p>
        </div>

        {isEmpty ? (
          <div className="ref-signals-empty">
            <p className="text-sm font-medium text-zinc-800">No standout patterns</p>
            <p className="mt-2 text-xs leading-relaxed text-primary-muted">
              {refName}&apos;s metrics sit near league averages. Check back as more
              games are logged.
            </p>
          </div>
        ) : (
          <ProgressiveSignalList signals={bundle.signals} variant="sidebar" />
        )}

        {seeded && (
          <div className="border-t border-border-subtle bg-amber-50/60 px-4 py-2.5 sm:px-5">
            <p className="text-xs leading-relaxed text-amber-900">
              Historical dataset, some splits use estimated closing lines.
            </p>
          </div>
        )}

        <div className="border-t border-border-subtle px-4 py-2.5 sm:px-5">
          <Link
            href={researchHubHref(league)}
            className="text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
          >
            All {league} dataset findings →
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <section id="profile-signals" className="section-block">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="section-title">Profile signals</h2>
            <ProvenanceIndicator
              sampleSize={bundle.sampleGate.sampleSize}
              lastUpdated={lastUpdated}
              source={`${bundle.sampleGames} games logged`}
            />
          </div>
          <p className="section-lead">
            Data-led patterns for {refName}, historical associations only.
          </p>
        </div>
        <Link
          href={researchHubHref(league)}
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
        >
          All {league} dataset findings →
        </Link>
      </div>

      <div className="ref-profile-section clinical-card">
        {isEmpty ? (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-zinc-800">
              {NO_SIGNAL_COPY}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-primary-muted">
              {refName}&apos;s metrics sit near league averages across scoring,
              whistle rate, and over frequency. {SIGNAL_LIMITATION_COPY}
            </p>
          </div>
        ) : (
          <ProgressiveSignalList signals={bundle.signals} variant="full" />
        )}

        {seeded && (
          <div className="border-t border-border-subtle bg-amber-50/60 px-4 py-3 sm:px-5">
            <p className="text-xs leading-relaxed text-amber-900">
              Historical dataset, some ATS/O/U splits use estimated closing lines
              where sportsbook data is unavailable. Patterns describe past games,
              not live market predictions.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
