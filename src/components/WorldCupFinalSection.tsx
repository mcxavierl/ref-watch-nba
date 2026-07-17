import Link from "next/link";
import { Trophy } from "lucide-react";
import { MatchStatusPill } from "@/components/hub/MatchStatusPill";
import { WorldCupFindingCard } from "@/components/worldcup/WorldCupFindingCard";
import { worldCupCountryFlag, worldCupTeamFlag } from "@/lib/worldcup/country-flags";
import type { WorldCupOfficial } from "@/lib/worldcup/final-2026";
import {
  computeWorldCupFinalFindings,
  resolveWorldCupFinal,
  worldCupFinalMeta,
} from "@/lib/worldcup/final-2026";
import "@/components/worldcup/worldcup-delight.css";

const WC_CHAMPAGNE = "#BFA86A";

const WC_HEADER_CARD =
  "wc-editorial-header-card rounded-2xl border border-slate-800 bg-slate-950 p-5 font-[family-name:var(--font-inter)]";

function OfficialName({ official }: { official: WorldCupOfficial }) {
  const flag = worldCupCountryFlag(official.country, official.countryCode);

  return (
    <span className="wc-official-name inline-flex items-center gap-1.5">
      {flag ? (
        <span className="wc-official-flag" aria-hidden>
          {flag}
        </span>
      ) : null}
      <span className="text-slate-100">{official.name}</span>
      <span className="text-slate-400">({official.country})</span>
    </span>
  );
}

export function WorldCupFinalSection() {
  const final = resolveWorldCupFinal();
  if (!final) return null;

  const findings = computeWorldCupFinalFindings(4);
  const meta = worldCupFinalMeta();
  const { match, officials } = final;
  const awayFlag = worldCupTeamFlag(match.awayTeam.code);
  const homeFlag = worldCupTeamFlag(match.homeTeam.code);

  const narrative = `${final.isUpcoming ? "Upcoming" : "Final"} at ${match.venueDisplay}, ${match.venueCity}. ${final.tournamentContext.headline}.`;

  return (
    <section
      className="overview-editorial-section overview-editorial-section--featured section-block font-[family-name:var(--font-inter)]"
      aria-labelledby="world-cup-final-heading"
    >
      <article className={WC_HEADER_CARD}>
        <div className="grid gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="wc-editorial-trophy-wrap inline-flex h-[2.35rem] shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-2.5"
                aria-hidden
              >
                <Trophy className="h-5 w-5" style={{ color: WC_CHAMPAGNE }} />
              </span>
              <div className="min-w-0">
                <p className="wc-editorial-kicker text-xs font-semibold uppercase tracking-wider">
                  FIFA World Cup 2026
                </p>
                <h2
                  className="wc-match-title mt-0.5 text-lg font-bold leading-snug sm:text-xl"
                  id="world-cup-final-heading"
                >
                  {awayFlag ? (
                    <span className="wc-team-flag mr-1" aria-hidden>
                      {awayFlag}
                    </span>
                  ) : null}
                  <span className="wc-team-name">{match.awayTeam.name}</span>
                  <span className="wc-match-vs"> vs </span>
                  <span className="wc-team-name">{match.homeTeam.name}</span>
                  {homeFlag ? (
                    <span className="wc-team-flag ml-1" aria-hidden>
                      {homeFlag}
                    </span>
                  ) : null}
                </h2>
              </div>
            </div>
            <MatchStatusPill label={match.stage} tone="prestige" />
          </div>

          <p className="wc-body-copy max-w-prose text-sm leading-relaxed">{narrative}</p>

          <dl className="grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 sm:grid-cols-3">
            <div>
              <dt className="wc-data-label text-xs font-semibold uppercase tracking-wider">
                Kickoff
              </dt>
              <dd className="wc-data-value mt-1 text-sm font-medium tabular-nums">
                {final.kickoffLabel}
              </dd>
            </div>
            <div>
              <dt className="wc-data-label text-xs font-semibold uppercase tracking-wider">
                Venue
              </dt>
              <dd className="wc-data-value mt-1 text-sm font-medium">{match.venue}</dd>
            </div>
            <div>
              <dt className="wc-data-label text-xs font-semibold uppercase tracking-wider">
                Referee
              </dt>
              <dd className="wc-data-value mt-1 text-sm font-medium">
                <OfficialName official={officials.referee} />
              </dd>
            </div>
          </dl>

          <div className="wc-editorial-officials-panel rounded-xl border border-slate-800 p-4">
            <h3 className="wc-panel-title text-sm font-semibold">Match officials</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="wc-official-line">
                <span className="font-medium text-slate-300">Referee:</span>{" "}
                <OfficialName official={officials.referee} />
              </li>
              <li className="wc-official-line">
                <span className="font-medium text-slate-300">Assistants:</span>{" "}
                <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                  {officials.assistantReferees.map((official, index) => (
                    <OfficialName key={`${official.name}-${index}`} official={official} />
                  ))}
                </span>
              </li>
              <li className="wc-official-line">
                <span className="font-medium text-slate-300">Fourth official:</span>{" "}
                <OfficialName official={officials.fourthOfficial} />
              </li>
              <li className="wc-official-line">
                <span className="font-medium text-slate-300">VAR:</span>{" "}
                <OfficialName official={officials.videoAssistantReferee} />
              </li>
              <li className="wc-official-line">
                <span className="font-medium text-slate-300">AVAR:</span>{" "}
                <OfficialName official={officials.assistantVar} />
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={match.fifaMatchUrl}
              className="wc-editorial-fifa-link text-sm font-medium hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              FIFA match centre
            </Link>
            <span className="wc-meta-copy text-xs tabular-nums">
              Match {match.matchNumber} · Source: {meta.source}
            </span>
          </div>
        </div>
      </article>

      {findings.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {findings.map((finding) => (
            <WorldCupFindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
