import { OgLeagueMark } from "@/components/og-components/og-league-mark";
import { leagueAccentColor } from "@/components/og-components/league-accent";
import type { OgLeagueHubCardData } from "@/components/og-components/types";
import { formatLeaguePaceValue } from "@/lib/league-pace-bars";
import { isCollegeLiveLeague } from "@/lib/verified-live-leagues";

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** Dashboard league hub card for OG snapshots (matches overview chooser styling). */
export function LeagueHubCard({ card }: { card: OgLeagueHubCardData }) {
  const collegeTier = isCollegeLiveLeague(card.leagueId);
  const accent = leagueAccentColor(card.leagueId);
  const highlighted = card.highlighted === true;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: 16,
        border: highlighted ? "1px solid #475569" : "1px solid #1e293b",
        backgroundColor: "#0f172a",
        padding: 12,
        boxShadow: highlighted
          ? `0 0 0 1px ${accent}55, 0 12px 28px ${accent}22`
          : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}88 100%)`,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          minWidth: 0,
          paddingTop: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 36,
            height: 36,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: "1px solid #334155",
            backgroundColor: "#0f172a",
          }}
        >
          <OgLeagueMark leagueId={card.leagueId} size={16} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
            flex: 1,
          }}
        >
          {collegeTier ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              College sports
            </span>
          ) : null}
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#f8fafc",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {collegeTier ? card.shortLabel : card.label}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "#94a3b8",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCount(card.refCount)} refs · {formatCount(card.gameCount)} games
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              marginTop: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 10,
                color: "#94a3b8",
                minWidth: 0,
              }}
            >
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {card.whistleLabel}
              </span>
              <strong
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatLeaguePaceValue(card.whistlePerGame)}
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 10,
                color: "#94a3b8",
                minWidth: 0,
              }}
            >
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {card.scoreLabel}
              </span>
              <strong
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatLeaguePaceValue(card.scorePerGame)}
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: "auto",
          flexShrink: 0,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        Open hub
      </div>
    </div>
  );
}
