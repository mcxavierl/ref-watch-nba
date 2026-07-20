import type { ReactElement, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { HeroView } from "@/components/og-components/HeroView";
import { WHISTLE_PATHS } from "@/lib/brand-colors";
import { loadOgFonts } from "@/lib/og-fonts";
import type { BrandOgContent } from "@/lib/og-brand";
import { leagueAccentFromOgTitle } from "@/lib/og-brand";
import type { HubOgContent } from "@/lib/og-hub";
import type { DashboardOgContent } from "@/lib/og-hero";
import type { LeagueInsightTone } from "@/lib/league-overview-insights";
import ogTailwindConfig from "../../tailwind.og.config";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

const BG_DEEP = "#020617";
const BG_SURFACE = "#0f172a";
const BG_ELEVATED = "#1e293b";
const CHAMPAGNE_GOLD = "#C5A059";
const TEXT_HEADLINE = "#f8fafc";
const TEXT_HERO = "#f1f5f9";
const TEXT_PRIMARY = "#e2e8f0";
const TEXT_NARRATIVE = "#cbd5e1";
const TEXT_LABEL = "#94a3b8";
const TEXT_MUTED = "#64748b";
const BORDER_SLATE_700 = "#334155";
const BORDER_SUBTLE = "#1e293b";
const LEAGUE_LABEL_WIDTH = 34;
const OG_FONT_FAMILY = "Inter, system-ui, sans-serif";

function hexAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ogHighlightSurface(tone: LeagueInsightTone): {
  background: string;
  border: string;
} {
  if (tone === "positive") {
    return {
      background: "rgba(2, 44, 34, 0.3)",
      border: "#065f46",
    };
  }
  if (tone === "negative") {
    return {
      background: "rgba(76, 5, 25, 0.3)",
      border: "#9f1239",
    };
  }
  return {
    background: BG_SURFACE,
    border: BORDER_SLATE_700,
  };
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
          border: `1px solid ${BORDER_SLATE_700}`,
          background: `linear-gradient(155deg, ${BG_SURFACE} 0%, ${BG_DEEP} 100%)`,
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        }}
      />
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={CHAMPAGNE_GOLD}
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

function OgAtmosphere() {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: -140,
        left: -60,
        width: 520,
        height: 520,
        borderRadius: 999,
        background:
          "radial-gradient(circle, rgba(197, 160, 89, 0.08) 0%, transparent 68%)",
      }}
    />
  );
}

function OgCanvas({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: BG_DEEP,
        fontFamily: OG_FONT_FAMILY,
      }}
    >
      <OgAtmosphere />
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage:
            "linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)",
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
  const pillAccent = accent ?? CHAMPAGNE_GOLD;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: BG_DEEP,
        padding: "26px 48px 22px",
        borderBottom: `1px solid ${BORDER_SUBTLE}`,
      }}
    >
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
                color: CHAMPAGNE_GOLD,
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
                  color: TEXT_HEADLINE,
                  background: BG_SURFACE,
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: `1px solid ${hexAlpha(pillAccent, 0.45)}`,
                  boxShadow: `0 0 0 1px ${hexAlpha(pillAccent, 0.12)}`,
                }}
              >
                {leagueLabel}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 600,
              color: CHAMPAGNE_GOLD,
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

function OgMetricsBento({
  metrics,
}: {
  metrics: Array<{ label: string; value: string }>;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderRadius: 16,
        border: `1px solid ${BORDER_SLATE_700}`,
        background: BG_SURFACE,
        overflow: "hidden",
      }}
    >
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: 4,
            padding: "16px 18px",
            borderRight:
              index < metrics.length - 1
                ? `1px solid ${BORDER_SLATE_700}`
                : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 800,
              color: TEXT_HEADLINE,
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
              color: TEXT_LABEL,
            }}
          >
            {metric.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function OgLeaguePills({
  leagues,
}: {
  leagues: Array<{ label: string; accent: string }>;
}) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {leagues.map((league) => (
        <div
          key={league.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            background: BG_SURFACE,
            border: `1px solid ${hexAlpha(league.accent, 0.35)}`,
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
  );
}

function OgHighlightCards({
  highlights,
}: {
  highlights: BrandOgContent["highlights"];
}) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {highlights.map((highlight) => {
        const surface = ogHighlightSurface(highlight.heroTone);

        return (
          <div
            key={`${highlight.league}-${highlight.headline}`}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 8,
              padding: "14px 16px",
              borderRadius: 16,
              background: surface.background,
              border: `1px solid ${surface.border}`,
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
                  color: TEXT_HERO,
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
                color: TEXT_NARRATIVE,
              }}
            >
              {highlight.headline}
            </div>
          </div>
        );
      })}
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

async function renderOgImage(jsx: ReactElement, useTailwind = false) {
  const fonts = await loadOgFonts();
  return new ImageResponse(jsx, {
    ...ogImageSize,
    fonts,
    ...(useTailwind
      ? { tailwindConfig: ogTailwindConfig as Record<string, unknown> }
      : {}),
  });
}

export async function renderDashboardOgImage(content: DashboardOgContent) {
  return renderOgImage(<HeroView {...content} />, true);
}

export async function renderBrandOgImage(content: BrandOgContent) {
  return renderOgImage(
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
                color: TEXT_HEADLINE,
                maxWidth: 920,
              }}
            >
              {content.tagline}
            </div>
          </div>

          <OgMetricsBento metrics={content.metrics} />
          <OgLeaguePills leagues={content.leagues} />
          <OgHighlightCards highlights={content.highlights} />
        </div>

        <OgFooter line={content.footer} />
      </OgCanvas>
    ),
  );
}

export async function renderSlateOgImage(content: {
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

  return renderOgImage(
    (
      <OgCanvas>
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
                color: TEXT_NARRATIVE,
                flex: 1,
                alignItems: "center",
                padding: "18px 20px",
                borderRadius: 16,
                background: BG_SURFACE,
                border: `1px solid ${BORDER_SLATE_700}`,
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
                  borderRadius: 16,
                  background: index === 0 ? hexAlpha(accent, 0.08) : BG_SURFACE,
                  border: `1px solid ${index === 0 ? hexAlpha(accent, 0.35) : BORDER_SLATE_700}`,
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
                      color: TEXT_HEADLINE,
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
                    color: TEXT_NARRATIVE,
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
  );
}

export async function renderHubOgImage(content: HubOgContent) {
  return renderOgImage(
    (
      <OgCanvas>
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
                color: TEXT_HEADLINE,
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
                color: TEXT_NARRATIVE,
                maxWidth: 880,
              }}
            >
              {content.lead}
            </div>
          </div>

          <OgMetricsBento metrics={content.metrics} />

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
                  border: `1px solid ${BORDER_SLATE_700}`,
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
  );
}
