import { OgLeagueMark } from "@/components/og-components/og-league-mark";
import { leagueMatchupGlow } from "@/components/og-components/league-accent";
import type { OgUpcomingSlateCardData } from "@/components/og-components/types";
import { formatSlateDateLabel } from "@/lib/slate-team-display";

/** Upcoming slate match card for OG snapshots (matches overview upcoming-game-card styling). */
export function UpcomingSlateCard({ game }: { game: OgUpcomingSlateCardData }) {
  const dateLabel = formatSlateDateLabel(game.slateDate);
  const glow = leagueMatchupGlow(game.leagueId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
        minHeight: 0,
        borderRadius: 16,
        border: "1px solid #1e293b",
        backgroundColor: "#020617",
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {dateLabel ? (
            <span
              style={{
                borderRadius: 999,
                border: `1px solid ${glow}44`,
                backgroundColor: "#0f172a",
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
                color: "#cbd5e1",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {dateLabel}
            </span>
          ) : null}
          <div
            style={{
              display: "flex",
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: "1px solid #334155",
              backgroundColor: "#0f172a",
            }}
          >
            <OgLeagueMark leagueId={game.leagueId} size={14} />
          </div>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          Open slate
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 18,
          border: `1px solid ${glow}44`,
          backgroundColor: "rgba(15, 23, 42, 0.88)",
          boxShadow: `0 0 24px ${glow}22`,
          padding: "16px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              minWidth: 0,
              flex: 1,
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: `1px solid ${glow}55`,
                backgroundColor: "#0f172a",
                fontSize: 12,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {game.awayTeam}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#ffffff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {game.awayTeam}
            </span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#94a3b8" }}>@</span>
          <div
            style={{
              display: "flex",
              minWidth: 0,
              flex: 1,
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: `1px solid ${glow}55`,
                backgroundColor: "#0f172a",
                fontSize: 12,
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              {game.homeTeam}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#ffffff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {game.homeTeam}
            </span>
          </div>
        </div>
        {game.gameContextLine ? (
          <p
            style={{
              marginTop: 8,
              textAlign: "center",
              fontSize: 10,
              fontWeight: 500,
              lineHeight: 1.35,
              color: "#cbd5e1",
            }}
          >
            {game.gameContextLine}
          </p>
        ) : null}
      </div>
    </div>
  );
}
