import Link from "next/link";
import type { ReactNode } from "react";
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
  "wc-data-capsule wc-data-capsule--span-full rounded-2xl border border-slate-800 bg-slate-950 p-5 font-[family-name:var(--font-inter)]";

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
      <span className="text-sm font-semibold text-slate-50">{official.name}</span>
      <span className="text-sm text-slate-400">({official.country})</span>
    </span>
  );
}

function OfficialRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="wc-official-row">
      <span className="wc-data-label shrink-0">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
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
      className="wc-narrative-section overview-editorial-section overview-editorial-section--featured section-block font-[family-name:var(--font-inter)]"
      aria-labelledby="world-cup-final-heading"
    >
      <div className="wc-data-grid wc-data-grid--bento">
        <article className={WC_CAPSULE}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-slate-400" aria-hidden />
                  <p className="wc-data-label">FIFA World Cup 2026</p>
                </div>
                <h2
                  className="wc-match-headline flex flex-wrap items-center gap-x-2.5 gap-y-2 text-3xl font-bold tracking-tight text-slate-50"
                  id="world-cup-final-heading"
                >
                  <span className="inline-flex items-center gap-2">
                    <FlagAvatar flag={awayFlag} label={match.awayTeam.name} />
                    <span>{match.awayTeam.name}</span>
                  </span>
                  <span className="text-xl font-semibold text-slate-400">vs</span>
                  <span className="inline-flex items-center gap-2">
                    <FlagAvatar flag={homeFlag} label={match.homeTeam.name} />
                    <span>{match.homeTeam.name}</span>
                  </span>
                </h2>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-400">{narrative}</p>
              </div>
              <MatchStatusPill label={match.stage} tone="clinical" />
            </div>

            <dl className="wc-match-meta-row">
              <div className="wc-match-meta-item">
                <dt className="wc-data-label">Kickoff</dt>
                <dd className="text-sm font-medium tabular-nums text-slate-50">{final.kickoffLabel}</dd>
              </div>
              <div className="wc-match-meta-item">
                <dt className="wc-data-label">Venue</dt>
                <dd className="text-sm font-medium text-slate-50">{match.venue}</dd>
              </div>
              <div className="wc-match-meta-item">
                <dt className="wc-data-label">Referee</dt>
                <dd>
                  <OfficialName official={officials.referee} />
                </dd>
              </div>
            </dl>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-sm font-semibold text-slate-50">Match officials</h3>
              <div className="wc-officials-grid mt-3">
                <OfficialRow label="Referee">
                  <OfficialName official={officials.referee} />
                </OfficialRow>
                <OfficialRow label="Fourth official">
                  <OfficialName official={officials.fourthOfficial} />
                </OfficialRow>
                <OfficialRow label="VAR">
                  <OfficialName official={officials.videoAssistantReferee} />
                </OfficialRow>
                <OfficialRow label="AVAR">
                  <OfficialName official={officials.assistantVar} />
                </OfficialRow>
                <div className="wc-official-row sm:col-span-2">
                  <span className="wc-data-label shrink-0">Assistants</span>
                  <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
                    {officials.assistantReferees.map((official, index) => (
                      <OfficialName key={`${official.name}-${index}`} official={official} />
                    ))}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={match.fifaMatchUrl}
                className="text-xs text-slate-400 hover:text-slate-50 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                FIFA match centre
              </Link>
              <span className="text-xs tabular-nums text-slate-400">
                Match {match.matchNumber} · Source: {meta.source}
              </span>
            </div>
          </div>
        </article>

        {findings.map((finding) => (
          <WorldCupFindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </section>
  );
}
