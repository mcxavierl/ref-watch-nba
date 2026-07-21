import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Layers,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { IntelligenceHeroView } from "@/lib/homepage-intelligence";

type IntelligenceHeroProps = {
  view: IntelligenceHeroView;
};

export function IntelligenceHero({ view }: IntelligenceHeroProps) {
  return (
    <section className="w-full space-y-6 section-block" aria-labelledby="intelligence-hero-heading">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-medium text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              <span>OFFICIATING DECISION INTELLIGENCE</span>
            </div>
            <h1
              className="text-3xl font-bold tracking-tight text-white md:text-4xl"
              id="intelligence-hero-heading"
            >
              Today&apos;s Intelligence
            </h1>
            <p className="text-sm leading-relaxed text-slate-400 md:text-base">
              Real-time behavioral modeling, crew friction analytics, and statistical anomaly
              detection across today&apos;s game slate.
            </p>
          </div>

          <div className="min-w-[280px] flex-shrink-0 space-y-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                TOP SIGNAL TODAY
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-300">
                {view.topSignalConfidence}% Confidence
              </span>
            </div>
            <div className="text-base font-semibold text-white">{view.topMatchup}</div>
            <p className="text-xs text-slate-400">{view.topSignalNote}</p>
            <Link
              href={view.topSignalHref}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 rw-focus-ring"
            >
              <span>View Intelligence</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-6 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3.5">
            <div className="font-mono text-xs text-slate-400">Games Analyzed</div>
            <div className="mt-1 text-xl font-bold text-white">{view.gamesAnalyzed}</div>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3.5">
            <div className="font-mono text-xs text-slate-400">Crew Effects</div>
            <div className="mt-1 text-xl font-bold text-cyan-400">
              {view.significantCrewEffects} Active
            </div>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3.5">
            <div className="font-mono text-xs text-slate-400">Anomaly Alerts</div>
            <div className="mt-1 flex items-center gap-1.5 text-xl font-bold text-amber-400">
              <ShieldAlert className="h-4 w-4" aria-hidden />
              <span>{view.anomalyAlerts} Flagged</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3.5">
            <div className="font-mono text-xs text-slate-400">Model Certainty</div>
            <div className="mt-1 text-xl font-bold text-emerald-400">
              {view.modelCertaintyPct}%
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 overflow-x-auto border-y border-slate-800/80 bg-slate-950 px-4 py-3 font-mono text-xs text-slate-300"
        role="region"
        aria-label="Platform proof metrics"
      >
        {view.proofMetrics.map((metric) => (
          <div key={metric.id} className="flex items-center gap-2 whitespace-nowrap">
            {metric.icon === "activity" ? (
              <Activity className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            ) : null}
            {metric.icon === "layers" ? (
              <Layers className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
            ) : null}
            <span className="text-slate-500">{metric.label}:</span>
            <span className="font-semibold text-white">{metric.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
