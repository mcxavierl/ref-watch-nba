import Link from "next/link";
import { SampleGateBadge } from "@/components/SampleGateBadge";
import type { ProfileSignalsBundle } from "@/lib/profile-signals";
import { formatDate } from "@/lib/data";

export function ProfileSignalsSection({
  bundle,
  refName,
  lastUpdated,
}: {
  bundle: ProfileSignalsBundle;
  refName: string;
  lastUpdated: string;
}) {
  const seeded = bundle.dataSource === "seeded";

  return (
    <section id="profile-signals" className="section-block scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Profile signals</h2>
          <p className="section-lead">
            Data-led patterns for {refName} — informational only, not picks.
          </p>
        </div>
        <Link
          href="/research"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
        >
          All dataset findings →
        </Link>
      </div>

      <div className="data-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-4 py-3 sm:px-5">
          <SampleGateBadge gate={bundle.sampleGate} />
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              seeded
                ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
                : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
            }`}
          >
            {seeded ? "Historical data" : "Live data"}
          </span>
          <span className="text-xs text-zinc-500">
            {bundle.sampleGames} games · {bundle.seasonRange} · Updated{" "}
            {formatDate(lastUpdated)}
          </span>
        </div>

        {bundle.signals.length === 0 ? (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-sm font-medium text-zinc-800">
              No standout patterns in this history
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
              {refName}&apos;s metrics sit near league averages across scoring,
              whistle rate, and over frequency. Check back as more games are logged.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {bundle.signals.map((signal) => (
              <li key={signal.kind} className="px-4 py-5 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-zinc-900">
                    {signal.headline}
                  </h3>
                  {signal.notable && (
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900 ring-1 ring-sky-200/80">
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
              Historical dataset — some ATS/O/U splits use estimated closing lines
              where sportsbook data is unavailable. Patterns describe past games,
              not live market edges.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
