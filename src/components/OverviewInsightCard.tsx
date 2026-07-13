"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import type { LeagueInsightCard, LeagueInsightTone } from "@/lib/league-overview-insights";
import { leagueHubHref } from "@/lib/leagues";

const InsightDrilldownModal = dynamic(
  () =>
    import("@/components/InsightDrilldownModal").then(
      (mod) => mod.InsightDrilldownModal,
    ),
  { ssr: false },
);

function heroValueClass(tone: LeagueInsightTone): string {
  if (tone === "positive") {
    return "text-emerald-600 dark:text-emerald-300";
  }
  if (tone === "negative") {
    return "text-red-600 dark:text-red-300";
  }
  return "text-slate-900 dark:text-zinc-100";
}

type OverviewInsightCardProps = {
  card: LeagueInsightCard;
  index: number;
};

export function OverviewInsightCard({ card, index }: OverviewInsightCardProps) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const drilldownEnabled = Boolean(card.drilldownId);

  function openDrilldown() {
    if (!drilldownEnabled) return;
    setDrilldownOpen(true);
  }

  return (
    <>
      <article
        className={`overview-insight-card relative flex flex-col gap-[0.85rem] overflow-hidden rounded-2xl border border-slate-100 bg-white p-[1.15rem_1.2rem_1rem] shadow-sm transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none dark:hover:border-zinc-700 dark:hover:shadow-[0_14px_36px_rgba(0,0,0,0.22)]${drilldownEnabled ? " overview-insight-card--drilldown" : ""}`}
        data-league={card.leagueId}
        style={{ "--insight-index": index } as CSSProperties}
      >
        <header className="overview-insight-card-head relative z-[1] flex items-center justify-between gap-3 px-[0.1rem] pe-[0.35rem]">
          <div className="overview-insight-league inline-flex items-center gap-[0.45rem]">
            <span className="overview-insight-league-mark" aria-hidden />
            <span className="overview-insight-league-label">{card.shortLabel}</span>
          </div>
          <p className="overview-insight-kicker m-0 min-w-0 max-w-[58%] flex-[1_1_auto] pe-[0.15rem] text-right text-[0.62rem] font-semibold tracking-wide text-slate-400 uppercase dark:text-zinc-500">
            {card.kicker}
          </p>
        </header>

        <button
          type="button"
          className="overview-insight-drilldown-trigger relative z-[1] m-0 block w-full cursor-pointer border-0 bg-transparent p-0 text-left text-inherit disabled:cursor-default"
          onClick={openDrilldown}
          disabled={!drilldownEnabled}
          aria-haspopup="dialog"
          aria-expanded={drilldownOpen}
          aria-label={
            drilldownEnabled
              ? `Open historical drill-down for ${card.entityName ?? "official"} and ${card.teamLabel ?? "team"}`
              : undefined
          }
        >
          <div className="flex flex-col gap-[0.15rem] rounded-xl border border-slate-200 bg-slate-100/70 px-[0.85rem] py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span
              className={`text-[clamp(1.65rem,4vw,2.15rem)] leading-none font-extrabold tracking-tight tabular-nums ${heroValueClass(card.heroTone)}`}
            >
              {card.heroValue}
            </span>
            <span className="text-[0.72rem] font-semibold tracking-wide text-slate-400 uppercase dark:text-zinc-500">
              {card.heroLabel}
            </span>
          </div>

          <div className="mt-[0.85rem] flex flex-col gap-[0.45rem]">
            <h3 className="m-0 text-[1.02rem] leading-snug font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              {card.entityHref && card.entityName ? (
                <>
                  <Link
                    href={card.entityHref}
                    className="text-inherit underline-offset-[0.15em] hover:text-slate-700 dark:hover:text-white"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {card.entityName}
                  </Link>
                  {card.teamLabel ? (
                    <>
                      {" "}
                      <span className="font-semibold text-slate-600 dark:text-zinc-400">
                        × {card.teamLabel}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                card.headline
              )}
            </h3>
            <p className="m-0 text-[0.9rem] leading-normal text-slate-600 dark:text-zinc-400">
              {card.story}
            </p>
            {drilldownEnabled ? (
              <p className="overview-insight-drilldown-hint mt-[0.65rem] text-xs font-medium">
                Tap for last 10 games, home/away splits, and crew context
              </p>
            ) : null}
          </div>
        </button>

        {card.stats.length > 0 ? (
          <dl className="relative z-[1] m-0 grid grid-cols-3 gap-[0.45rem]">
            {card.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="m-0 text-[0.62rem] font-medium tracking-wide text-slate-400 uppercase dark:text-zinc-500">
                  {stat.label}
                </dt>
                <dd className="m-0 mt-[0.1rem] text-[0.92rem] font-bold text-slate-900 tabular-nums dark:text-zinc-100">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <footer className="relative z-[1] mt-[0.15rem] flex flex-wrap gap-x-3 gap-y-[0.45rem]">
          {card.links.map((link, linkIndex) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                linkIndex === 0
                  ? "overview-insight-link overview-insight-link--primary pointer-events-auto inline-flex items-center gap-1 text-[0.78rem] font-semibold"
                  : "overview-insight-link pointer-events-auto inline-flex items-center gap-1 text-[0.78rem] font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }
            >
              {link.label}
              {linkIndex === 0 ? <ArrowRight aria-hidden className="h-[0.85rem] w-[0.85rem]" /> : null}
            </Link>
          ))}
        </footer>

        <Link
          href={leagueHubHref(card.leagueId)}
          className="overview-insight-card-cover absolute inset-0 z-0"
          aria-label={`Open ${card.label} hub`}
        />
      </article>

      {drilldownEnabled ? (
        <InsightDrilldownModal
          card={card}
          open={drilldownOpen}
          onClose={() => setDrilldownOpen(false)}
        />
      ) : null}
    </>
  );
}
