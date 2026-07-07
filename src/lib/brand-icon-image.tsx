import { ImageResponse } from "next/og";

/** Matches header mark: sapphire shell, gold whistle stroke. */
const HEADER_GOLD = "#d8b85d";
const WHISTLE_PATHS = [
  "M10 6v4",
  "M21 6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.675A7 7 0 1 1 9 6z",
] as const;

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
          background:
            "linear-gradient(145deg, #0b5fa2 0%, #063967 68%, #02284f 100%)",
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
