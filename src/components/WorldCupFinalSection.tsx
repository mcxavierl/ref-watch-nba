import Link from "next/link";
import { Trophy } from "lucide-react";
import { MatchStatusPill } from "@/components/hub/MatchStatusPill";
import { WorldCupFindingCard } from "@/components/worldcup/WorldCupFindingCard";
import {
  computeWorldCupFinalFindings,
  resolveWorldCupFinal,
  worldCupFinalMeta,
} from "@/lib/worldcup/final-2026";

const WC_CHAMPAGNE = "#BFA86A";

const TEAM_FLAGS: Record<string, string> = {
  ARG: "🇦🇷",
  ESP: "🇪🇸",
};

const WC_HEADER_CARD =
  "rounded-2xl border border-slate-800 bg-slate-950 p-5 font-[family-name:var(--font-inter)]";

export function WorldCupFinalSection() {
  const final = resolveWorldCupFinal();
  if (!final) return null;

  const findings = computeWorldCupFinalFindings(4);
  const meta = worldCupFinalMeta();
  const { match, officials } = final;
  const awayFlag = TEAM_FLAGS[match.awayTeam.code] ?? match.awayTeam.code;
  const homeFlag = TEAM_FLAGS[match.homeTeam.code] ?? match.homeTeam.code;

  const narrative = `${final.isUpcoming ? "Upcoming" : "Final"} at ${match.venueDisplay}, ${match.venueCity}. ${final.tournamentContext.headline}.`;

  return (
    <section
      className="overview-editorial-section overview-editorial-section--featured section-block font-[family-name:var(--font-inter)]"
      aria-labelledby="world-cup-final-heading"
    >
      <article className={WC_HEADER_CARD}>
        <div className="grid gap-5">
          {/* Header row: brand + status pill */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="inline-flex h-[2.35rem] shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-2.5"
                aria-hidden
              >
                <Trophy className="h-5 w-5" style={{ color: WC_CHAMPAGNE }} />
              </span>
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: WC_CHAMPAGNE }}
                >
                  FIFA World Cup 2026
                </p>
                <h2
                  className="mt-0.5 text-lg font-bold leading-snug text-white sm:text-xl"
                  id="world-cup-final-heading"
                >
                  <span className="mr-1 inline-block w-6 text-center text-xl leading-none">
                    {awayFlag}
                  </span>
                  {match.awayTeam.name} vs {match.homeTeam.name}
                  <span className="ml-1 inline-block w-6 text-center text-xl leading-none">
                    {homeFlag}
                  </span>
                </h2>
              </div>
            </div>
            <MatchStatusPill label={match.stage} tone="prestige" />
          </div>

          {/* Narrative block */}
          <p className="max-w-prose text-sm leading-relaxed text-slate-300">{narrative}</p>

          {/* Kickoff / Venue / Referee data row */}
          <dl className="grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Kickoff
              </dt>
              <dd className="mt-1 text-sm font-medium tabular-nums text-slate-200">
                {final.kickoffLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Venue
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-200">{match.venue}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Referee
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-200">
                {officials.referee.name}{" "}
                <span className="text-slate-500">({officials.referee.country})</span>
              </dd>
            </div>
          </dl>

          {/* Match officials detail */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="text-sm font-semibold text-slate-200">Match officials</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-400">
              <li>
                <span className="font-medium text-slate-300">Referee:</span>{" "}
                {officials.referee.name} ({officials.referee.country})
              </li>
              <li>
                <span className="font-medium text-slate-300">Assistants:</span>{" "}
                {officials.assistantReferees
                  .map((official) => `${official.name} (${official.country})`)
                  .join(", ")}
              </li>
              <li>
                <span className="font-medium text-slate-300">Fourth official:</span>{" "}
                {officials.fourthOfficial.name} ({officials.fourthOfficial.country})
              </li>
              <li>
                <span className="font-medium text-slate-300">VAR:</span>{" "}
                {officials.videoAssistantReferee.name} ({officials.videoAssistantReferee.country})
              </li>
              <li>
                <span className="font-medium text-slate-300">AVAR:</span>{" "}
                {officials.assistantVar.name} ({officials.assistantVar.country})
              </li>
            </ul>
          </div>

          {/* Footer links */}
          <div className="flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={match.fifaMatchUrl}
              className="text-sm font-medium hover:underline"
              style={{ color: WC_CHAMPAGNE }}
              target="_blank"
              rel="noopener noreferrer"
            >
              FIFA match centre
            </Link>
            <span className="text-xs tabular-nums text-slate-500">
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
