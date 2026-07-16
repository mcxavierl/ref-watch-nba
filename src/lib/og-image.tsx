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
import {
  OG_DELTA_NEGATIVE,
  OG_DELTA_POSITIVE,
  leagueAccentFromOgTitle,
} from "@/lib/og-brand";
import type { HubOgContent } from "@/lib/og-hub";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

const BG_DEEP = "#020617";
const BG_SURFACE = "#0f172a";
const BG_ELEVATED = "#1e293b";
const TEXT_PRIMARY = "#e2e8f0";
const TEXT_SECONDARY = "#94a3b8";
const TEXT_MUTED = "#64748b";
const BORDER_SUBTLE = "#1e293b";
const LEAGUE_LABEL_WIDTH = 34;

function ogDeltaColor(tone: "positive" | "negative" | "neutral"): string {
  if (tone === "positive") return OG_DELTA_POSITIVE;
  if (tone === "negative") return OG_DELTA_NEGATIVE;
  return HEADER_GOLD_BRIGHT;
}

function hexAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
          background: `radial-gradient(circle, ${hexAlpha(glow, 0.22)} 0%, transparent 70%)`,
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
        background: `linear-gradient(145deg, ${BG_DEEP} 0%, ${BG_SURFACE} 52%, ${BG_DEEP} 100%)`,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <OgAtmosphere accent={accent} />
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 0,
          opacity: 0.12,
          backgroundImage:
            "linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)",
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
        background: `linear-gradient(180deg, ${BG_SURFACE} 0%, ${BG_DEEP} 100%)`,
        padding: "26px 48px 22px",
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
        boxShadow: "none",
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
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: HEADER_GOLD_BRIGHT,
                textShadow:
                  "0 1px 0 rgba(255, 244, 185, 0.28), 0 4px 18px rgba(0, 24, 51, 0.42)",
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
                  border: `1px solid ${hexAlpha(pillAccent, 0.35)}`,
                  boxShadow: `0 0 0 1px ${hexAlpha(pillAccent, 0.18)}, 0 6px 16px rgba(0, 0, 0, 0.28)`,
                }}
              >
                {leagueLabel}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 19,
              fontWeight: 500,
              color: TEXT_SECONDARY,
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

function OgFooter({ line }: { line: string }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "0 48px 26px",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.03em",
          color: TEXT_MUTED,
          lineHeight: 1.35,
        }}
      >
        {line}
      </div>
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
                  background: BG_SURFACE,
                  border: `1px solid ${BORDER_SUBTLE}`,
                  boxShadow: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    fontWeight: 800,
                    color: HEADER_GOLD_BRIGHT,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
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
                  border: `1px solid ${hexAlpha(league.accent, 0.28)}`,
                  boxShadow: `0 0 18px ${hexAlpha(league.accent, 0.12)}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: league.accent,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: TEXT_PRIMARY,
                    width: LEAGUE_LABEL_WIDTH,
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
                  background:
                    highlight.cardBackground ??
                    `linear-gradient(155deg, ${hexAlpha(highlight.accent, 0.1)} 0%, ${BG_SURFACE} 100%)`,
                  border: `1px solid ${hexAlpha(highlight.accent, 0.24)}`,
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.24)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: highlight.accent,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: highlight.accent,
                        width: LEAGUE_LABEL_WIDTH,
                      }}
                    >
                      {highlight.league}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 18,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.02em",
                      color: ogDeltaColor(highlight.heroTone),
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
                    letterSpacing: "-0.01em",
                    color: TEXT_SECONDARY,
                  }}
                >
                  {highlight.headline}
                </div>
              </div>
            ))}
          </div>
        </div>

        <OgFooter line={content.footer} />
      </OgCanvas>
    ),
    ogImageSize,
  );
}

export function renderSlateOgImage(content: {
  title: string;
  subtitle: string;
  signals: Array<{
    id: string;
    matchup: string;
    headline: string;
    provenance: string;
    provenanceLabel: string;
  }>;
  emptyMessage: string | null;
  footer: string;
  dataNote?: string;
}) {
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
                      ? `linear-gradient(155deg, ${hexAlpha(accent, 0.12)} 0%, ${BG_SURFACE} 100%)`
                      : `linear-gradient(160deg, rgba(255, 255, 255, 0.04) 0%, ${BG_ELEVATED} 100%)`,
                  border: `1px solid ${hexAlpha(accent, index === 0 ? 0.28 : 0.14)}`,
                  boxShadow:
                    index === 0
                      ? `0 10px 24px rgba(0, 0, 0, 0.28), 0 0 24px ${hexAlpha(accent, 0.1)}`
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

        <OgFooter
          line={[content.dataNote, content.footer].filter(Boolean).join(" · ")}
        />
      </OgCanvas>
    ),
    ogImageSize,
  );
}

export function renderHubOgImage(content: HubOgContent) {
  return new ImageResponse(
    (
      <OgCanvas accent={content.accent}>
        <OgHeaderBand
          leagueLabel={content.leagueLabel}
          subtitle="Referee analytics hub"
          accent={content.accent}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "22px 48px 12px",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.12,
                color: TEXT_PRIMARY,
                maxWidth: 920,
              }}
            >
              {content.title}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                fontWeight: 500,
                lineHeight: 1.45,
                color: TEXT_SECONDARY,
                maxWidth: 880,
              }}
            >
              {content.lead}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 0,
              borderRadius: 16,
              border: `1px solid ${BORDER_SUBTLE}`,
              background: BG_SURFACE,
              overflow: "hidden",
            }}
          >
            {content.metrics.map((metric, index) => (
              <div
                key={metric.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  gap: 4,
                  padding: "16px 18px",
                  borderRight:
                    index < content.metrics.length - 1
                      ? `1px solid ${BORDER_SUBTLE}`
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 800,
                    color: TEXT_PRIMARY,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {metric.value}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 11,
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {content.tags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: TEXT_PRIMARY,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${BORDER_SUBTLE}`,
                  background: BG_ELEVATED,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        <OgFooter line={content.footer} />
      </OgCanvas>
    ),
    ogImageSize,
  );
}
