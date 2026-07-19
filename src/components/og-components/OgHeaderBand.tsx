import { WHISTLE_PATHS } from "@/lib/brand-colors";

const CHAMPAGNE_GOLD = "#C5A059";

export function OgHeaderBand({
  leagueLabel,
  subtitle,
}: {
  leagueLabel?: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderBottom: "1px solid #1e293b",
        backgroundColor: "#020617",
        padding: "20px 40px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 52,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            border: "1px solid #334155",
            backgroundColor: "#0f172a",
          }}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={CHAMPAGNE_GOLD}
            strokeWidth={2.35}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {WHISTLE_PATHS.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: CHAMPAGNE_GOLD,
              }}
            >
              REF WATCH
            </span>
            {leagueLabel ? (
              <span
                style={{
                  borderRadius: 999,
                  border: "1px solid #334155",
                  backgroundColor: "#0f172a",
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#f8fafc",
                }}
              >
                {leagueLabel}
              </span>
            ) : null}
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: CHAMPAGNE_GOLD }}>
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}
