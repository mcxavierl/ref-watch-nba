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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#020617",
        color: "#f1f5f9",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <OgHeaderBand
        leagueLabel={leagueLabelForFocus(focusLeagueId)}
        subtitle={subtitle}
      />

      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 12,
          padding: "16px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flex: 1.55,
            minWidth: 0,
          }}
        >
          {[0, 1].map((row) => (
            <div key={row} style={{ display: "flex", gap: 10, flex: 1 }}>
              {cards.slice(row * 3, row * 3 + 3).map((card) => (
                <div key={card.leagueId} style={{ display: "flex", flex: 1, minWidth: 0 }}>
                  <LeagueHubCard card={card} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", minWidth: 0, flex: 0.95 }}>
          {slateGame ? (
            <UpcomingSlateCard game={slateGame} />
          ) : (
            <div
              style={{
                display: "flex",
                height: "100%",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                border: "1px dashed #1e293b",
                backgroundColor: "#0f172a",
                padding: 16,
                fontSize: 14,
                color: "#94a3b8",
              }}
            >
              Upcoming slate loading
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "0 32px 16px",
          fontSize: 12,
          fontWeight: 600,
          color: "#64748b",
        }}
      >
        refwatch.ca · Historical referee analytics · Not betting advice
      </div>
    </div>
  );
}
