import Link from "next/link";
import type { ProfileSignalsBundle } from "@/lib/profile-signals";
import { researchHubHref, type FindingLeague } from "@/lib/findings-shared";
import { NO_SIGNAL_COPY, SIGNAL_LIMITATION_COPY } from "@/lib/trust-charter";

export function ProfileSignalsSection({
  bundle,
  refName,
  variant = "full",
  league = "NBA",
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
      <aside id="profile-signals" className="ref-signals-sidebar scroll-mt-24">
        <div className="border-b border-border-subtle px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-zinc-800">Profile signals</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Data-led patterns, informational only.
          </p>
        </div>

        {isEmpty ? (
          <div className="ref-signals-empty">
            <p className="text-sm font-medium text-zinc-800">No standout patterns</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {refName}&apos;s metrics sit near league averages. Check back as more
              games are logged.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {bundle.signals.map((signal) => (
              <li key={signal.kind} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                  <h3 className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">
                    {signal.headline}
                  </h3>
                  {signal.notable && (
                    <span className="profile-signal-badge shrink-0 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200/80">
                      Notable
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  {signal.body}
                </p>
                {signal.stats.length > 0 && (
                  <dl className="mt-3 grid gap-2">
                    {signal.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-md bg-zinc-50 px-2.5 py-2"
                      >
                        <dt className="text-xs font-medium text-zinc-500">
                          {stat.label}
                        </dt>
                        <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-zinc-900">
                          {stat.value}
                        </dd>
                        {stat.detail && (
                          <dd className="mt-0.5 text-xs text-zinc-500">
                            {stat.detail}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
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
    <section id="profile-signals" className="section-block scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Profile signals</h2>
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

      <div className="data-card">
        {isEmpty ? (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-zinc-800">
              {NO_SIGNAL_COPY}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
              {refName}&apos;s metrics sit near league averages across scoring,
              whistle rate, and over frequency. {SIGNAL_LIMITATION_COPY}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {bundle.signals.map((signal) => (
              <li key={signal.kind} className="px-4 py-5 sm:px-5">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <h3 className="min-w-0 flex-1 text-base font-semibold text-zinc-900">
                    {signal.headline}
                  </h3>
                  {signal.notable && (
                    <span className="profile-signal-badge shrink-0 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200/80">
                      Notable
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {signal.body}
                </p>
                {signal.stats.length > 0 && (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    {signal.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-md border border-border-subtle bg-zinc-50 px-3 py-2"
                      >
                        <dt className="text-xs font-medium text-zinc-500">
                          {stat.label}
                        </dt>
                        <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-zinc-900">
                          {stat.value}
                        </dd>
                        {stat.detail && (
                          <dd className="mt-0.5 text-xs text-zinc-500">
                            {stat.detail}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
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
