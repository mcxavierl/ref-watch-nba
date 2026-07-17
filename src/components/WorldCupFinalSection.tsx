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

const WC_CAPSULE =
  "wc-authority-capsule wc-authority-capsule--match rounded-2xl border border-slate-800 bg-slate-950 p-6 font-[family-name:var(--font-inter)]";

function FlagAvatar({ flag, label }: { flag: string; label: string }) {
  if (!flag) return null;
  return (
    <span className="wc-flag-avatar" aria-label={label} role="img">
      {flag}
    </span>
  );
}

function OfficialName({ official }: { official: WorldCupOfficial }) {
  const flag = worldCupCountryFlag(official.country, official.countryCode);

  return (
    <span className="inline-flex items-center gap-2">
      <FlagAvatar flag={flag} label={official.country} />
      <span className="text-sm font-medium text-white">{official.name}</span>
      <span className="text-slate-500">({official.country})</span>
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
      className="wc-authority-section overview-editorial-section overview-editorial-section--featured section-block font-[family-name:var(--font-inter)]"
      aria-labelledby="world-cup-final-heading"
    >
      <article className={WC_CAPSULE}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#BFA86A]" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#BFA86A]">
                  FIFA World Cup 2026
                </p>
              </div>
              <h2
                className="wc-match-headline flex flex-wrap items-center gap-x-3 gap-y-2 text-5xl font-extrabold tracking-tighter text-white"
                id="world-cup-final-heading"
              >
                <span className="inline-flex items-center gap-2">
                  <FlagAvatar flag={awayFlag} label={match.awayTeam.name} />
                  <span>{match.awayTeam.name}</span>
                </span>
                <span className="text-3xl font-bold tracking-tight text-slate-500">vs</span>
                <span className="inline-flex items-center gap-2">
                  <FlagAvatar flag={homeFlag} label={match.homeTeam.name} />
                  <span>{match.homeTeam.name}</span>
                </span>
              </h2>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-400">{narrative}</p>
            </div>
            <MatchStatusPill label={match.stage} tone="prestige" />
          </div>

          <dl className="flex flex-col gap-4 border-t border-slate-800 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Kickoff</dt>
              <dd className="mt-1 text-sm font-medium tabular-nums text-white">{final.kickoffLabel}</dd>
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Venue</dt>
              <dd className="mt-1 text-sm font-medium text-white">{match.venue}</dd>
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-xs uppercase tracking-wider text-slate-500">Referee</dt>
              <dd className="mt-1">
                <OfficialName official={officials.referee} />
              </dd>
            </div>
          </dl>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <h3 className="text-sm font-semibold text-white">Match officials</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-slate-500">Referee:</span>
                <OfficialName official={officials.referee} />
              </li>
              <li className="flex flex-wrap items-start gap-x-2 gap-y-2">
                <span className="font-medium text-slate-500">Assistants:</span>
                <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-2">
                  {officials.assistantReferees.map((official, index) => (
                    <OfficialName key={`${official.name}-${index}`} official={official} />
                  ))}
                </span>
              </li>
              <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-slate-500">Fourth official:</span>
                <OfficialName official={officials.fourthOfficial} />
              </li>
              <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-slate-500">VAR:</span>
                <OfficialName official={officials.videoAssistantReferee} />
              </li>
              <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-slate-500">AVAR:</span>
                <OfficialName official={officials.assistantVar} />
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={match.fifaMatchUrl}
              className="text-xs text-slate-600 hover:text-[#BFA86A] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              FIFA match centre
            </Link>
            <span className="text-xs tabular-nums text-slate-600">
              Match {match.matchNumber} · Source: {meta.source}
            </span>
          </div>
        </div>
      </article>

      {findings.length > 0 ? (
        <div className="mt-4 flex flex-col gap-4">
          {findings.map((finding) => (
            <WorldCupFindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
