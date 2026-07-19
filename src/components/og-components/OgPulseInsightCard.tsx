import type { BrandOgHighlight } from "@/lib/og-brand";

const BG_SURFACE = "#0f172a";
const BORDER_SLATE = "#334155";
const TEXT_HEADLINE = "#f8fafc";
const TEXT_NARRATIVE = "#cbd5e1";
const TEXT_MUTED = "#64748b";

/** Satori-safe insight pulse card for dashboard OG snapshots. */
export function OgPulseInsightCard({
  insight,
  emphasized = false,
}: {
  insight: BrandOgHighlight;
  emphasized?: boolean;
}) {
  const cardStyle: Record<string, string | number> = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    gap: 10,
    padding: "14px 14px 12px",
    borderRadius: 16,
    border: emphasized ? `1px solid ${insight.accent}66` : `1px solid ${BORDER_SLATE}`,
    backgroundColor: BG_SURFACE,
    boxShadow: emphasized ? `0 0 0 1px ${insight.accent}22` : "none",
  };

  if (emphasized) {
    cardStyle.backgroundImage = `linear-gradient(180deg, ${insight.accent}14 0%, ${BG_SURFACE} 72%)`;
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            display: "flex",
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: insight.accent,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            display: "flex",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: insight.accent,
          }}
        >
          {insight.league}
        </span>
        <span
          style={{
            display: "flex",
            marginLeft: "auto",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: TEXT_MUTED,
          }}
        >
          Notable
        </span>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: TEXT_HEADLINE,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {insight.heroValue}
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.35,
          letterSpacing: "-0.01em",
          color: TEXT_NARRATIVE,
        }}
      >
        {insight.headline}
      </div>
    </div>
  );
}
