import type { LiveNcaaConferenceId } from "@/lib/ncaa-conference-gate";

type NcaaConferenceLogoProps = {
  conferenceId: LiveNcaaConferenceId;
  className?: string;
  size?: number;
};

/** Stylized conference marks for light and dark surfaces (not official league marks). */
export function NcaaConferenceLogo({
  conferenceId,
  className = "",
  size = 28,
}: NcaaConferenceLogoProps) {
  const height = size;
  const width = Math.round(size * (conferenceId === "Big East" ? 2.4 : 1.8));

  return (
    <span
      className={`ncaa-conference-logo ${className}`.trim()}
      data-conference={conferenceId}
      aria-hidden
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={conferenceId}
      >
        <ConferenceMark conferenceId={conferenceId} width={width} height={height} />
      </svg>
    </span>
  );
}

function ConferenceMark({
  conferenceId,
  width,
  height,
}: {
  conferenceId: LiveNcaaConferenceId;
  width: number;
  height: number;
}) {
  const rx = 6;
  const label =
    conferenceId === "Big Ten"
      ? "B1G"
      : conferenceId === "Big 12"
        ? "XII"
        : conferenceId === "Big East"
          ? "BE"
          : conferenceId;

  return (
    <>
      <rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        rx={rx}
        className="ncaa-conference-logo-frame"
      />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="ncaa-conference-logo-label"
        fontSize={conferenceId === "Big East" ? height * 0.38 : height * 0.42}
        fontWeight={700}
        letterSpacing={conferenceId === "SEC" ? "0.08em" : "0.02em"}
      >
        {label}
      </text>
    </>
  );
}
