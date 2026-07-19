import { LeagueHubCard } from "@/components/og-components/LeagueHubCard";
import { OgHeaderBand } from "@/components/og-components/OgHeaderBand";
import { UpcomingSlateCard } from "@/components/og-components/UpcomingSlateCard";
import type { HeroViewProps } from "@/components/og-components/types";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

function leagueLabelForFocus(focusLeagueId: LeagueId | null | undefined): string | undefined {
  if (!focusLeagueId) return undefined;
  return LEAGUES[focusLeagueId]?.shortLabel ?? focusLeagueId.toUpperCase();
}

/** Dashboard hero snapshot: 2x3 league hub grid plus one upcoming slate card. */
export function HeroView({
  leagueCards,
  slateGame,
  focusLeagueId = null,
  subtitle = "Verified officiating analytics",
}: HeroViewProps) {
  const cards = leagueCards.map((card) => ({
    ...card,
    highlighted: focusLeagueId ? card.leagueId === focusLeagueId : card.highlighted,
  }));

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 font-sans text-slate-100">
      <OgHeaderBand
        leagueLabel={leagueLabelForFocus(focusLeagueId)}
        subtitle={subtitle}
      />

      <div className="flex flex-1 gap-3 px-8 py-4">
        <div className="grid min-w-0 flex-[1.55] grid-cols-3 grid-rows-2 gap-2.5">
          {cards.map((card) => (
            <LeagueHubCard key={card.leagueId} card={card} />
          ))}
        </div>

        <div className="min-w-0 flex-[0.95]">
          {slateGame ? <UpcomingSlateCard game={slateGame} /> : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
              Upcoming slate loading
            </div>
          )}
        </div>
      </div>

      <div className="px-8 pb-4 text-xs font-semibold text-slate-500">
        refwatch.ca · Historical referee analytics · Not betting advice
      </div>
    </div>
  );
}
