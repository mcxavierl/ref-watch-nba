"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Flame,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { LeagueNavMark } from "@/components/LeagueSwitchMark";
import { TeamLogo } from "@/components/TeamLogo";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";
import { resolveSlateTeam, slateTeamLogoSport } from "@/lib/slate-team-display";
import {
  buildSlateGameIntelligence,
  type SlateGameIntelligence,
  type WhistlePersonality,
} from "@/lib/slate-intelligence";
import { formatSigned } from "@/lib/stats-utils";

const SLATE_ICON_SIZE = 14;

function ConfidenceRing({
  confidencePct,
  size = 36,
}: {
  confidencePct: number;
  size?: number;
}) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidencePct / 100) * circumference;

  return (
    <svg
      className="slate-game-card__confidence-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <circle
        className="slate-game-card__confidence-track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
      />
      <circle
        className="slate-game-card__confidence-progress"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="slate-game-card__confidence-label"
      >
        {confidencePct}%
      </text>
    </svg>
  );
}

function DeltaWhyTooltip({ intel }: { intel: SlateGameIntelligence }) {
  return (
    <span className="slate-game-card__delta-wrap">
      <span className="slate-game-card__delta-tag">{intel.whistleDeltaLabel}</span>
      <span className="slate-game-card__delta-tooltip" role="tooltip">
        <span className="slate-game-card__delta-tooltip-title">Why this delta?</span>
        <span>Crew baseline: {formatSigned(intel.deltaTooltip.crewBaseline)}</span>
        <span>
          Historical matchup: {formatSigned(intel.deltaTooltip.historicalMatchup)}
        </span>
        <span>
          Team split pressure: {formatSigned(intel.deltaTooltip.teamSplitPressure)}
        </span>
      </span>
    </span>
  );
}

function VerdictIcon({ personality }: { personality: WhistlePersonality }) {
  if (personality === "high") {
    return (
      <Flame
        aria-hidden
        size={SLATE_ICON_SIZE}
        strokeWidth={2.25}
        className="slate-game-card__icon slate-game-card__icon--positive"
      />
    );
  }
  if (personality === "defensive") {
    return (
      <ShieldAlert
        aria-hidden
        size={SLATE_ICON_SIZE}
        strokeWidth={2.25}
        className="slate-game-card__icon slate-game-card__icon--negative"
      />
    );
  }
  return (
    <TrendingUp
      aria-hidden
      size={SLATE_ICON_SIZE}
      strokeWidth={2.25}
      className="slate-game-card__icon slate-game-card__icon--neutral"
    />
  );
}

function SignalTierIcon({ intel }: { intel: SlateGameIntelligence }) {
  if (intel.signalTier === "pending") {
    return (
      <Clock
        aria-hidden
        size={SLATE_ICON_SIZE}
        strokeWidth={2.25}
        className="slate-game-card__icon slate-game-card__icon--neutral"
      />
    );
  }
  if (intel.signalTier === "high" || intel.signalTier === "elevated") {
    return (
      <Zap
        aria-hidden
        size={SLATE_ICON_SIZE}
        strokeWidth={2.25}
        className="slate-game-card__icon slate-game-card__icon--signal"
      />
    );
  }
  return null;
}

function StatusChip({
  statusKind,
  statusLabel,
}: {
  statusKind: SlateGameIntelligence["statusKind"];
  statusLabel: string;
}) {
  let icon: ReactNode = null;
  if (statusKind === "live") {
    icon = (
      <Activity
        aria-hidden
        size={SLATE_ICON_SIZE}
        strokeWidth={2.25}
        className="slate-game-card__icon slate-game-card__icon--live-pulse"
      />
    );
  }

  return (
    <span className={`slate-game-card__status slate-game-card__status--${statusKind}`}>
      {icon}
      <span>{statusLabel}</span>
    </span>
  );
}

export function SlateGameCard({
  game,
  index = 0,
  onOpenPreview,
}: {
  game: OverviewSlateEntry;
  index?: number;
  onOpenPreview?: () => void;
}) {
  const awayTeam = resolveSlateTeam(game.leagueId, game.awayTeam);
  const homeTeam = resolveSlateTeam(game.leagueId, game.homeTeam);
  const intel = buildSlateGameIntelligence(game);
  const showScore = game.gamePhase === "live" || game.gamePhase === "final";

  const handleActivate = () => {
    onOpenPreview?.();
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (!onOpenPreview) return;
    const target = event.target as HTMLElement;
    if (target.closest("a, button, .slate-game-card__delta-wrap")) return;
    handleActivate();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onOpenPreview) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <article
      className={`slate-game-card upcoming-game-card slate-game-card--${intel.personality}${
        onOpenPreview ? " slate-game-card--interactive upcoming-game-card--interactive" : ""
      }`}
      data-league={game.leagueId}
      data-status={game.status}
      data-signal={intel.personality}
      style={{ "--upcoming-i": index, "--slate-i": index } as CSSProperties}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onOpenPreview ? 0 : undefined}
      role={onOpenPreview ? "button" : undefined}
      aria-label={
        onOpenPreview
          ? `Open ${awayTeam.abbr} at ${homeTeam.abbr} intelligence preview`
          : undefined
      }
    >
      <header className="slate-game-card__topbar">
        <div className="slate-game-card__topbar-left">
          <span className="slate-game-card__league-mark" aria-hidden>
            <LeagueNavMark league={game.leagueId} active={false} />
          </span>
          <div className="slate-game-card__matchup-label">
            <span className="slate-game-card__matchup-abbr">
              {awayTeam.abbr} @ {homeTeam.abbr}
            </span>
            <span className="slate-game-card__signal-tier" aria-label={intel.signalTierLabel}>
              <SignalTierIcon intel={intel} />
              <span>{intel.signalTierLabel}</span>
            </span>
          </div>
        </div>
        <StatusChip statusKind={intel.statusKind} statusLabel={intel.statusLabel} />
      </header>

      <section className="slate-game-card__verdict" aria-label="RefWatch verdict">
        <p
          className={`slate-game-card__verdict-headline slate-game-card__verdict-headline--${intel.personality}`}
        >
          <VerdictIcon personality={intel.personality} />
          <span>{intel.verdictHeadline.toUpperCase()}</span>
        </p>
        <div className="slate-game-card__metric-grid">
          <div className="slate-game-card__metric">
            <span className="slate-game-card__metric-label">Expected whistles</span>
            <span className="slate-game-card__metric-value tabular-nums">
              {intel.expectedWhistles > 0 ? intel.expectedWhistles.toFixed(1) : "-"}
            </span>
            <span className="slate-game-card__metric-meta tabular-nums">
              vs {intel.leagueAvgWhistles > 0 ? intel.leagueAvgWhistles.toFixed(1) : "-"} league avg{" "}
              <DeltaWhyTooltip intel={intel} />
            </span>
          </div>
          <div className="slate-game-card__metric">
            <span className="slate-game-card__metric-label">Model confidence</span>
            <div className="slate-game-card__confidence-wrap">
              <ConfidenceRing confidencePct={intel.confidencePct} />
            </div>
          </div>
          <div className="slate-game-card__metric">
            <span className="slate-game-card__metric-label">Evidence score</span>
            <span className="slate-game-card__metric-value tabular-nums">
              {intel.evidenceScore.toFixed(1)} / 10
            </span>
          </div>
        </div>
      </section>

      <div
        className="slate-game-card__teams"
        aria-label={`${awayTeam.abbr} at ${homeTeam.abbr}`}
      >
        <div className="slate-game-card__team">
          <TeamLogo team={awayTeam} sport={slateTeamLogoSport(game.leagueId)} size="md" />
          <span className="slate-game-card__team-abbr">{awayTeam.abbr}</span>
          {showScore ? (
            <span className="slate-game-card__team-score tabular-nums">
              {game.awayScore ?? 0}
            </span>
          ) : null}
        </div>
        <span className="slate-game-card__at" aria-hidden>
          @
        </span>
        <div className="slate-game-card__team">
          <TeamLogo team={homeTeam} sport={slateTeamLogoSport(game.leagueId)} size="md" />
          <span className="slate-game-card__team-abbr">{homeTeam.abbr}</span>
          {showScore ? (
            <span className="slate-game-card__team-score tabular-nums">
              {game.homeScore ?? 0}
            </span>
          ) : null}
        </div>
      </div>

      <footer className="slate-game-card__crew-footer">
        <div className="slate-game-card__crew-meta">
          {intel.crewChiefName ? (
            <>
              <span className="slate-game-card__crew-role">Crew chief</span>
              <strong className="slate-game-card__crew-name">{intel.crewChiefName}</strong>
            </>
          ) : (
            <span className="slate-game-card__crew-pending">Crew pending</span>
          )}
          {intel.crewCount > 1 ? (
            <span className="slate-game-card__crew-count" aria-label={`${intel.crewCount}-person crew`}>
              <Users size={12} strokeWidth={2.25} aria-hidden />
              <span aria-hidden>{intel.crewCount}</span>
            </span>
          ) : null}
        </div>
      </footer>

      {onOpenPreview ? (
        <p className="slate-game-card__interaction-cue">Click card for evidence breakdown</p>
      ) : null}

      <div className="slate-game-card__trust-footer">
        <span className="slate-game-card__trust-meta tabular-nums">
          <CheckCircle2
            aria-hidden
            size={SLATE_ICON_SIZE}
            strokeWidth={2.25}
            className="slate-game-card__icon slate-game-card__icon--positive"
          />
          v{intel.modelVersion} Model ·{" "}
          {intel.sampleGames > 0 ? intel.sampleGames.toLocaleString("en-US") : "-"}{" "}
          game sample
        </span>
        <div className="slate-game-card__trust-actions">
          {onOpenPreview ? (
            <button
              type="button"
              className="slate-game-card__intel-link"
              onClick={(event) => {
                event.stopPropagation();
                onOpenPreview();
              }}
            >
              Open intelligence →
            </button>
          ) : null}
          <PrefetchLink href="/methodology" className="slate-game-card__methodology-link">
            Methodology →
          </PrefetchLink>
        </div>
      </div>
    </article>
  );
}
