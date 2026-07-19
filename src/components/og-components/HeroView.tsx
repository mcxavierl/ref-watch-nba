import { OgHeaderBand } from "@/components/og-components/OgHeaderBand";
import { OgPulseInsightCard } from "@/components/og-components/OgPulseInsightCard";
import { UpcomingSlateCard } from "@/components/og-components/UpcomingSlateCard";
import type { HeroViewProps } from "@/components/og-components/types";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

function leagueLabelForFocus(focusLeagueId: LeagueId | null | undefined): string | undefined {
  if (!focusLeagueId) return undefined;
  return LEAGUES[focusLeagueId]?.shortLabel ?? focusLeagueId.toUpperCase();
}

/** Dashboard OG snapshot: insight pulse row plus upcoming slate card. */
export function HeroView({
  pulseInsights,
  slateGame,
  focusLeagueId = null,
  subtitle = "Verified officiating analytics",
}: HeroViewProps) {
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
          gap: 16,
          padding: "18px 32px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 712,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            League pulse
          </div>
          <div style={{ display: "flex", gap: 12, height: 168 }}>
            {pulseInsights.map((insight, index) => (
              <div
                key={`${insight.league}-${insight.headline}`}
                style={{ display: "flex", width: 229, height: "100%" }}
              >
                <OgPulseInsightCard
                  insight={insight}
                  emphasized={index === 0 && Boolean(focusLeagueId)}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", width: 408, height: 196 }}>
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
