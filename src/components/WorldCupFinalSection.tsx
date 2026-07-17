import Link from "next/link";
import { Trophy } from "lucide-react";
import { FindingCard } from "@/components/FindingsSection";
import {
  computeWorldCupFinalFindings,
  resolveWorldCupFinal,
  worldCupFinalMeta,
} from "@/lib/worldcup/final-2026";

const TEAM_FLAGS: Record<string, string> = {
  ARG: "🇦🇷",
  ESP: "🇪🇸",
};

export function WorldCupFinalSection() {
  const final = resolveWorldCupFinal();
  if (!final) return null;

  const findings = computeWorldCupFinalFindings(4);
  const meta = worldCupFinalMeta();
  const { match, officials } = final;
  const awayFlag = TEAM_FLAGS[match.awayTeam.code] ?? match.awayTeam.code;
  const homeFlag = TEAM_FLAGS[match.homeTeam.code] ?? match.homeTeam.code;

  return (
    <section
      className="overview-editorial-section overview-editorial-section--featured section-block"
      aria-labelledby="world-cup-final-heading"
    >
      <article className="overview-research-hub-card data-card">
        <span className="overview-research-hub-card-accent" aria-hidden />

        <div className="overview-research-hub-card-head">
          <div className="overview-research-hub-card-brand">
            <span className="overview-research-hub-card-logo-wrap" aria-hidden>
              <Trophy className="h-5 w-5 text-[var(--wc-research-accent)]" />
            </span>
            <div>
              <p className="overview-research-hub-card-kicker">FIFA World Cup 2026</p>
              <h2 className="overview-research-hub-card-title" id="world-cup-final-heading">
                <span aria-label={match.awayTeam.name}>{awayFlag}</span>{" "}
                {match.awayTeam.name} vs {match.homeTeam.name}{" "}
                <span aria-label={match.homeTeam.name}>{homeFlag}</span>
              </h2>
            </div>
          </div>
          <span className="overview-research-hub-card-badge">{match.stage}</span>
        </div>

        <p className="overview-research-hub-card-story">
          {final.isUpcoming ? "Upcoming" : "Final"} at {match.venueDisplay},{" "}
          {match.venueCity}. {final.tournamentContext.headline}.
        </p>

        <dl className="overview-research-hub-card-stats">
          <div>
            <dt>Kickoff</dt>
            <dd>{final.kickoffLabel}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{match.venue}</dd>
          </div>
          <div>
            <dt>Referee</dt>
            <dd>
              {officials.referee.name}{" "}
              <span className="text-zinc-500">({officials.referee.country})</span>
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--wc-research-accent)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--wc-research-accent)_6%,transparent)] p-4">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Match officials</h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ink-secondary)]">
            <li>
              <span className="font-medium text-[var(--ink)]">Referee:</span>{" "}
              {officials.referee.name} ({officials.referee.country})
            </li>
            <li>
              <span className="font-medium text-[var(--ink)]">Assistants:</span>{" "}
              {officials.assistantReferees
                .map((official) => `${official.name} (${official.country})`)
                .join(", ")}
            </li>
            <li>
              <span className="font-medium text-[var(--ink)]">Fourth official:</span>{" "}
              {officials.fourthOfficial.name} ({officials.fourthOfficial.country})
            </li>
            <li>
              <span className="font-medium text-[var(--ink)]">VAR:</span>{" "}
              {officials.videoAssistantReferee.name} ({officials.videoAssistantReferee.country})
            </li>
            <li>
              <span className="font-medium text-[var(--ink)]">AVAR:</span>{" "}
              {officials.assistantVar.name} ({officials.assistantVar.country})
            </li>
          </ul>
        </div>

        <div className="overview-research-hub-card-footer mt-4">
          <Link
            href={match.fifaMatchUrl}
            className="overview-research-hub-card-cta"
            target="_blank"
            rel="noopener noreferrer"
          >
            FIFA match centre
          </Link>
          <span className="overview-research-hub-card-link">
            Match {match.matchNumber} · Source: {meta.source}
          </span>
        </div>
      </article>

      {findings.length > 0 ? (
        <div className="finding-accordion-stack mt-6">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
