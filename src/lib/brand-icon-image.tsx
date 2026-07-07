import { ImageResponse } from "next/og";
import { HEADER_GOLD, MARK_GRADIENT, WHISTLE_PATHS } from "@/lib/brand-colors";

export function renderWhistleIcon(size: number) {
  const radius = Math.round(size * (size <= 32 ? 0.28 : 0.22));
  const iconSize = Math.round(size * 0.62);
  const strokeWidth = size <= 32 ? 2.6 : 2.2;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: MARK_GRADIENT,
          borderRadius: radius,
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke={HEADER_GOLD}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {WHISTLE_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
