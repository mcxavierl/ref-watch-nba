import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import {
  HEADER_GOLD,
  HEADER_GOLD_BRIGHT,
  HEADER_GOLD_INK,
  HEADER_GRADIENT,
  HEADER_INK,
  HEADER_SAPPHIRE_CENTER,
  MARK_GRADIENT,
  WHISTLE_PATHS,
} from "@/lib/brand-colors";
import type { BrandOgContent } from "@/lib/og-brand";
import { leagueAccentFromOgTitle } from "@/lib/og-brand";
import type { nbaOgContent } from "@/lib/og-slate";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

const BG_DEEP = "#0b0f19";
const BG_SURFACE = "#131820";
const BG_ELEVATED = "#1a2230";
const TEXT_PRIMARY = "#f9fafb";
const TEXT_SECONDARY = "#d1d5db";
const TEXT_MUTED = "#9ca3af";
const BORDER_SUBTLE = "rgba(45, 55, 72, 0.9)";

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
          border: "1px solid rgba(96, 169, 229, 0.42)",
          background: MARK_GRADIENT,
          boxShadow:
            "inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 14px 28px rgba(0, 10, 28, 0.55)",
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

function OgAtmosphere({ accent }: { accent?: string }) {
  const glow = accent ?? HEADER_SAPPHIRE_CENTER;

  return (
    <>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: -120,
          left: -80,
          width: 520,
          height: 520,
          borderRadius: 999,
          background: `radial-gradient(circle, rgba(216, 184, 93, 0.16) 0%, transparent 68%)`,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 40,
          right: -120,
          width: 460,
          height: 460,
          borderRadius: 999,
          background: `radial-gradient(circle, color-mix(in srgb, ${glow} 22%, transparent) 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -180,
          left: 280,
          width: 640,
          height: 640,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(10, 95, 167, 0.18) 0%, transparent 72%)",
        }}
      />
    </>
  );
}

function OgCanvas({
  accent,
  children,
}: {
  accent?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(145deg, ${BG_DEEP} 0%, ${BG_SURFACE} 48%, #101725 100%)`,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <OgAtmosphere accent={accent} />
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 0,
          opacity: 0.22,
          backgroundImage:
            "linear-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.14) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          flex: 1,
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function OgHeaderBand({
  leagueLabel,
  subtitle,
  accent,
}: {
  leagueLabel?: string;
  subtitle: string;
  accent?: string;
}) {
  const pillAccent = accent ?? HEADER_SAPPHIRE_CENTER;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: HEADER_GRADIENT,
        padding: "28px 48px 24px",
        boxShadow: "0 10px 32px rgba(0, 12, 30, 0.45)",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: "auto 0 0",
          height: 1,
          background:
            "linear-gradient(90deg, transparent 6%, rgba(151, 205, 255, 0.28) 30%, rgba(217, 238, 255, 0.62) 50%, rgba(151, 205, 255, 0.28) 70%, transparent 94%)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <OgWhistleMark size={76} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: HEADER_GOLD,
                textShadow:
                  "0 1px 0 rgba(255, 244, 185, 0.22), 0 4px 18px rgba(0, 24, 51, 0.42)",
              }}
            >
              REF WATCH
            </div>
            {leagueLabel ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: HEADER_GOLD_INK,
                  background: `linear-gradient(180deg, ${HEADER_GOLD_BRIGHT} 0%, ${HEADER_GOLD} 58%, #b98d3e 100%)`,
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: `1px solid color-mix(in srgb, ${pillAccent} 35%, #fff)`,
                  boxShadow: `0 0 0 1px color-mix(in srgb, ${pillAccent} 18%, transparent), 0 6px 16px rgba(0, 0, 0, 0.28)`,
                }}
              >
                {leagueLabel}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 21,
              fontWeight: 500,
              color: HEADER_INK,
              letterSpacing: "-0.01em",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}

function OgFooter({ lines }: { lines: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "0 48px 26px",
        gap: 6,
        marginTop: "auto",
      }}
    >
      {lines.map((line) => (
        <div
          key={line}
          style={{
            display: "flex",
            fontSize: line === "refwatch.ca" ? 12 : 13,
            fontWeight: line === "refwatch.ca" ? 700 : 500,
            letterSpacing: line === "refwatch.ca" ? "0.08em" : "0.01em",
            textTransform: line === "refwatch.ca" ? "uppercase" : "none",
            color: line === "refwatch.ca" ? HEADER_GOLD : TEXT_MUTED,
            lineHeight: 1.35,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function renderBrandOgImage(content: BrandOgContent) {
  return new ImageResponse(
    (
      <OgCanvas>
        <OgHeaderBand subtitle={content.subtitle} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "30px 48px 18px",
            gap: 22,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                color: TEXT_PRIMARY,
                maxWidth: 920,
              }}
            >
              {content.tagline}
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {content.metrics.map((metric) => (
              <div
                key={metric.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  gap: 4,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: `linear-gradient(160deg, rgba(255, 255, 255, 0.06) 0%, ${BG_ELEVATED} 100%)`,
                  border: `1px solid ${BORDER_SUBTLE}`,
                  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.22)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 800,
                    color: HEADER_GOLD_BRIGHT,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {metric.value}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: TEXT_MUTED,
                  }}
                >
                  {metric.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {content.leagues.map((league) => (
              <div
                key={league.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: `1px solid color-mix(in srgb, ${league.accent} 28%, ${BORDER_SUBTLE})`,
                  boxShadow: `0 0 18px color-mix(in srgb, ${league.accent} 12%, transparent)`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: league.accent,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: TEXT_PRIMARY,
                  }}
                >
                  {league.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {content.highlights.map((highlight) => (
              <div
                key={`${highlight.league}-${highlight.headline}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  gap: 8,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: `linear-gradient(155deg, color-mix(in srgb, ${highlight.accent} 10%, ${BG_ELEVATED}) 0%, ${BG_SURFACE} 100%)`,
                  border: `1px solid color-mix(in srgb, ${highlight.accent} 24%, ${BORDER_SUBTLE})`,
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.24)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: highlight.accent,
                    }}
                  >
                    {highlight.league}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 18,
                      fontWeight: 800,
                      color: HEADER_GOLD_BRIGHT,
                    }}
                  >
                    {highlight.heroValue}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: TEXT_SECONDARY,
                  }}
                >
                  {highlight.headline}
                </div>
              </div>
            ))}
          </div>
        </div>

        <OgFooter lines={[content.footer, "refwatch.ca"]} />
      </OgCanvas>
    ),
    ogImageSize,
  );
}

export function renderSlateOgImage(content: ReturnType<typeof nbaOgContent>) {
  const league = content.title.replace(/^Ref Watch\s+/i, "");
  const accent = leagueAccentFromOgTitle(content.title);

  return new ImageResponse(
    (
      <OgCanvas accent={accent}>
        <OgHeaderBand leagueLabel={league} subtitle={content.subtitle} accent={accent} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "24px 48px 16px",
            gap: 12,
          }}
        >
          {content.emptyMessage ? (
            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 600,
                color: TEXT_SECONDARY,
                flex: 1,
                alignItems: "center",
                padding: "18px 20px",
                borderRadius: 14,
                background: BG_ELEVATED,
                border: `1px solid ${BORDER_SUBTLE}`,
              }}
            >
              {content.emptyMessage}
            </div>
          ) : (
            content.signals.map((signal, index) => (
              <div
                key={signal.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "14px 18px",
                  borderRadius: 14,
                  background:
                    index === 0
                      ? `linear-gradient(155deg, color-mix(in srgb, ${accent} 12%, ${BG_ELEVATED}) 0%, ${BG_SURFACE} 100%)`
                      : `linear-gradient(160deg, rgba(255, 255, 255, 0.04) 0%, ${BG_ELEVATED} 100%)`,
                  border: `1px solid color-mix(in srgb, ${accent} ${index === 0 ? 28 : 14}%, ${BORDER_SUBTLE})`,
                  boxShadow:
                    index === 0
                      ? `0 10px 24px rgba(0, 0, 0, 0.28), 0 0 24px color-mix(in srgb, ${accent} 10%, transparent)`
                      : "0 6px 16px rgba(0, 0, 0, 0.18)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 4,
                      height: 28,
                      borderRadius: 999,
                      background: accent,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      fontSize: 22,
                      fontWeight: 700,
                      color: TEXT_PRIMARY,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {signal.matchup}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 17,
                    fontWeight: 500,
                    color: TEXT_SECONDARY,
                    paddingLeft: 16,
                    lineHeight: 1.35,
                  }}
                >
                  {`${signal.headline}${signal.provenance !== "computed-from-real" ? ` · ${signal.provenanceLabel}` : ""}`}
                </div>
              </div>
            ))
          )}
        </div>

        <OgFooter lines={[content.dataNote, content.footer, "refwatch.ca"]} />
      </OgCanvas>
    ),
    ogImageSize,
  );
}
