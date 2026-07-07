import { ImageResponse } from "next/og";
import { nbaOgContent } from "@/lib/og-slate";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

export function renderSlateOgImage(
  content: ReturnType<typeof nbaOgContent>,
  accentColor: string,
) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%)",
          padding: 48,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: accentColor,
            }}
          />
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#18181b" }}>
            {content.title}
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 8, fontSize: 20, color: "#52525b" }}>
          {content.subtitle}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 32,
            gap: 16,
            flex: 1,
          }}
        >
          {content.emptyMessage ? (
            <div style={{ display: "flex", fontSize: 24, color: "#71717a" }}>
              {content.emptyMessage}
            </div>
          ) : (
            content.signals.map((signal) => (
              <div
                key={signal.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: "4px solid #d4d4d8",
                  paddingLeft: 16,
                }}
              >
                <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: "#18181b" }}>
                  {signal.matchup}
                </div>
                <div style={{ display: "flex", fontSize: 18, color: "#52525b", marginTop: 4 }}>
                  {`${signal.headline}${signal.provenance !== "computed-from-real" ? ` · ${signal.provenanceLabel}` : ""}`}
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ display: "flex", fontSize: 14, color: "#71717a", lineHeight: 1.4 }}>
          {content.dataNote}
        </div>
        <div style={{ display: "flex", marginTop: 8, fontSize: 12, color: "#a1a1aa", lineHeight: 1.35 }}>
          {content.footer}
        </div>
      </div>
    ),
    ogImageSize,
  );
}
