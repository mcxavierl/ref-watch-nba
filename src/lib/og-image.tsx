import { ImageResponse } from "next/og";
import {
  HEADER_GOLD,
  HEADER_GOLD_BRIGHT,
  HEADER_GOLD_INK,
  HEADER_GRADIENT,
  HEADER_INK,
  HEADER_SAPPHIRE,
  HEADER_SAPPHIRE_CENTER,
  MARK_GRADIENT,
  WHISTLE_PATHS,
} from "@/lib/brand-colors";
import type { nbaOgContent } from "@/lib/og-slate";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

function OgWhistleMark({ size }: { size: number }) {
  const ringSize = Math.round(size * 1.08);
  const iconSize = Math.round(size * 0.58);
  const radius = Math.round(ringSize * 0.28);

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: ringSize,
        height: ringSize,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          border: "1px solid rgba(96, 169, 229, 0.36)",
          background: MARK_GRADIENT,
          boxShadow:
            "inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 9px 18px rgba(0, 18, 45, 0.38)",
        }}
      />
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={HEADER_GOLD}
        strokeWidth={2.35}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: "relative" }}
      >
        {WHISTLE_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </div>
  );
}

export function renderSlateOgImage(content: ReturnType<typeof nbaOgContent>) {
  const league = content.title.replace(/^Ref Watch\s+/i, "");

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            background: HEADER_GRADIENT,
            padding: "36px 48px 32px",
            boxShadow: "0 8px 28px rgba(0, 22, 48, 0.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "absolute",
              inset: "auto 0 0",
              height: 1,
              background:
                "linear-gradient(90deg, transparent 8%, rgba(151, 205, 255, 0.24) 28%, rgba(217, 238, 255, 0.56) 50%, rgba(151, 205, 255, 0.24) 72%, transparent 92%)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <OgWhistleMark size={72} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 40,
                    fontWeight: 700,
                    letterSpacing: "0.035em",
                    color: HEADER_GOLD,
                    textShadow:
                      "0 1px 0 rgba(255, 244, 185, 0.18), 0 2px 10px rgba(0, 24, 51, 0.32)",
                  }}
                >
                  REF WATCH
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: HEADER_GOLD_INK,
                    background: `linear-gradient(180deg, ${HEADER_GOLD_BRIGHT} 0%, ${HEADER_GOLD} 58%, #b98d3e 100%)`,
                    padding: "6px 12px",
                    borderRadius: 999,
                  }}
                >
                  {league}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 500,
                  color: HEADER_INK,
                }}
              >
                {content.subtitle}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "28px 48px 32px",
            gap: 14,
          }}
        >
          {content.emptyMessage ? (
            <div
              style={{
                display: "flex",
                fontSize: 24,
                color: "#52525b",
                flex: 1,
                alignItems: "center",
              }}
            >
              {content.emptyMessage}
            </div>
          ) : (
            content.signals.map((signal) => (
              <div
                key={signal.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: `4px solid ${HEADER_SAPPHIRE_CENTER}`,
                  paddingLeft: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 600,
                    color: HEADER_GOLD_INK,
                  }}
                >
                  {signal.matchup}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    color: "#52525b",
                    marginTop: 4,
                  }}
                >
                  {`${signal.headline}${signal.provenance !== "computed-from-real" ? ` · ${signal.provenanceLabel}` : ""}`}
                </div>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "0 48px 28px",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", fontSize: 14, color: "#71717a", lineHeight: 1.4 }}>
            {content.dataNote}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 12,
              color: "#a1a1aa",
              lineHeight: 1.35,
            }}
          >
            {content.footer}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 4,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: HEADER_SAPPHIRE,
              textTransform: "uppercase",
            }}
          >
            refwatch.ca
          </div>
        </div>
      </div>
    ),
    ogImageSize,
  );
}
