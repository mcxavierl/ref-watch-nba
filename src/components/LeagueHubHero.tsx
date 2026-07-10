import type { ReactNode } from "react";
import type { LeagueId } from "@/lib/leagues";

/** Leagues with sport-watermark hub heroes (court / rink / field / pitch). */
export type HubHeroLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "cbb" | "cfb"
>;

type LeagueHubHeroProps = {
  leagueId: HubHeroLeagueId;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

/**
 * NBA court in feet (94×50). Basket 5.25' from baseline; key 16×19;
 * FT circle r=6 nested inside 3PT arc (r=23.75 from basket, corners at 22').
 */
function BasketballCourtWatermark() {
  // Scale: 10 units = 1 foot → viewBox 940×500
  const W = 940;
  const H = 500;
  const midX = W / 2;
  const midY = H / 2;
  const basketL = 52.5; // 5.25 ft
  const basketR = W - basketL;
  const keyDepth = 190; // 19 ft
  const keyHalf = 80; // 8 ft (16 ft lane)
  const ftR = 60; // 6 ft
  const threeR = 237.5; // 23.75 ft
  const cornerInset = 30; // 3 ft from sideline
  // Arc meets corner line: x = basket ± sqrt(r² − (midY−cornerY)²)
  const threeJoin = Math.sqrt(threeR * threeR - (midY - cornerInset) ** 2);
  const threeJoinL = basketL + threeJoin;
  const threeJoinR = basketR - threeJoin;

  return (
    <svg
      className="league-hub-hero-watermark-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <rect x="8" y="8" width={W - 16} height={H - 16} rx="2" {...STROKE} />
      <line x1={midX} y1="8" x2={midX} y2={H - 8} {...STROKE} />
      <circle cx={midX} cy={midY} r="60" {...STROKE} />

      {/* Left key + FT semicircle (outer half only — stays inside 3PT) */}
      <rect
        x="8"
        y={midY - keyHalf}
        width={keyDepth - 8}
        height={keyHalf * 2}
        {...STROKE}
      />
      <path
        d={`M ${keyDepth} ${midY - ftR} A ${ftR} ${ftR} 0 0 1 ${keyDepth} ${midY + ftR}`}
        {...STROKE}
      />
      <circle cx={basketL} cy={midY} r="40" {...STROKE} />
      <circle cx={basketL} cy={midY} r="6" {...STROKE} />

      {/* Left 3PT: corner straights + arc fully outside the key/FT circle */}
      <path
        d={[
          `M 8 ${cornerInset}`,
          `L ${threeJoinL} ${cornerInset}`,
          `A ${threeR} ${threeR} 0 0 1 ${threeJoinL} ${H - cornerInset}`,
          `L 8 ${H - cornerInset}`,
        ].join(" ")}
        {...STROKE}
      />

      {/* Right key + FT + 3PT (mirror) */}
      <rect
        x={W - keyDepth}
        y={midY - keyHalf}
        width={keyDepth - 8}
        height={keyHalf * 2}
        {...STROKE}
      />
      <path
        d={`M ${W - keyDepth} ${midY - ftR} A ${ftR} ${ftR} 0 0 0 ${W - keyDepth} ${midY + ftR}`}
        {...STROKE}
      />
      <circle cx={basketR} cy={midY} r="40" {...STROKE} />
      <circle cx={basketR} cy={midY} r="6" {...STROKE} />
      <path
        d={[
          `M ${W - 8} ${cornerInset}`,
          `L ${threeJoinR} ${cornerInset}`,
          `A ${threeR} ${threeR} 0 0 0 ${threeJoinR} ${H - cornerInset}`,
          `L ${W - 8} ${H - cornerInset}`,
        ].join(" ")}
        {...STROKE}
      />
    </svg>
  );
}

/**
 * NHL rink in feet (200×85). Goal lines 11' from ends; blue lines 75' from ends;
 * faceoff circles r=15; crease r=6; corner radius 28'.
 */
function HockeyRinkWatermark() {
  const W = 2000;
  const H = 850;
  const r = 280;
  const midX = W / 2;
  const midY = H / 2;
  const goalL = 110;
  const goalR = W - 110;
  const blueL = 750;
  const blueR = W - 750;
  const faceR = 150;
  const creaseR = 60;
  // End-zone faceoff spots: 20' from goal line, 22' from long axis
  const faceX1 = goalL + 200;
  const faceX2 = goalR - 200;
  const faceY1 = midY - 220;
  const faceY2 = midY + 220;

  return (
    <svg
      className="league-hub-hero-watermark-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <rect x="20" y="20" width={W - 40} height={H - 40} rx={r} ry={r} {...STROKE} />
      <line x1={midX} y1="20" x2={midX} y2={H - 20} {...STROKE} />
      <line
        x1={blueL}
        y1="20"
        x2={blueL}
        y2={H - 20}
        {...STROKE}
        strokeDasharray="14 12"
      />
      <line
        x1={blueR}
        y1="20"
        x2={blueR}
        y2={H - 20}
        {...STROKE}
        strokeDasharray="14 12"
      />
      <line x1={goalL} y1="20" x2={goalL} y2={H - 20} {...STROKE} />
      <line x1={goalR} y1="20" x2={goalR} y2={H - 20} {...STROKE} />
      <circle cx={midX} cy={midY} r={faceR} {...STROKE} />
      <circle cx={midX} cy={midY} r="12" {...STROKE} />
      {/* Neutral-zone faceoff dots */}
      <circle cx={(blueL + midX) / 2} cy={faceY1} r="10" {...STROKE} />
      <circle cx={(blueL + midX) / 2} cy={faceY2} r="10" {...STROKE} />
      <circle cx={(blueR + midX) / 2} cy={faceY1} r="10" {...STROKE} />
      <circle cx={(blueR + midX) / 2} cy={faceY2} r="10" {...STROKE} />
      {/* End-zone faceoff circles */}
      <circle cx={faceX1} cy={faceY1} r={faceR} {...STROKE} />
      <circle cx={faceX1} cy={faceY2} r={faceR} {...STROKE} />
      <circle cx={faceX2} cy={faceY1} r={faceR} {...STROKE} />
      <circle cx={faceX2} cy={faceY2} r={faceR} {...STROKE} />
      {/* Creases */}
      <path
        d={`M ${goalL} ${midY - creaseR} A ${creaseR} ${creaseR} 0 0 1 ${goalL} ${midY + creaseR}`}
        {...STROKE}
      />
      <path
        d={`M ${goalR} ${midY - creaseR} A ${creaseR} ${creaseR} 0 0 0 ${goalR} ${midY + creaseR}`}
        {...STROKE}
      />
    </svg>
  );
}

/**
 * American football field: 100 yd + two 10 yd end zones × 53⅓ yd.
 */
function FootballFieldWatermark() {
  const W = 1200; // 120 yards × 10
  const H = 533; // 53.3 yards × 10
  const end = 100;
  const hashInset = 123; // ~12.3 yd from sideline (NFL hashes)

  const yardLines = [];
  for (let y = 10; y <= 110; y += 5) {
    const x = y * 10;
    yardLines.push(
      <line
        key={y}
        x1={x}
        y1="12"
        x2={x}
        y2={H - 12}
        {...STROKE}
        strokeWidth={y === 60 ? 2 : y % 10 === 0 ? 1.35 : 1}
        strokeOpacity={y % 10 === 0 ? 1 : 0.55}
        vectorEffect="non-scaling-stroke"
      />,
    );
  }

  const hashes = [];
  for (let y = 11; y <= 109; y += 1) {
    if (y % 5 === 0) continue;
    const x = y * 10;
    hashes.push(
      <g key={`h-${y}`} strokeOpacity="0.45">
        <line
          x1={x}
          y1={hashInset}
          x2={x}
          y2={hashInset + 14}
          {...STROKE}
          strokeWidth="1.1"
        />
        <line
          x1={x}
          y1={H - hashInset - 14}
          x2={x}
          y2={H - hashInset}
          {...STROKE}
          strokeWidth="1.1"
        />
      </g>,
    );
  }

  return (
    <svg
      className="league-hub-hero-watermark-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <rect x="12" y="12" width={W - 24} height={H - 24} rx="4" {...STROKE} />
      <line x1={end} y1="12" x2={end} y2={H - 12} {...STROKE} strokeWidth="2" />
      <line
        x1={W - end}
        y1="12"
        x2={W - end}
        y2={H - 12}
        {...STROKE}
        strokeWidth="2"
      />
      {yardLines}
      {hashes}
    </svg>
  );
}

/**
 * Soccer pitch ~105×68 m. Penalty 16.5×40.32; six-yard 5.5×18.32; circle r=9.15.
 */
function SoccerPitchWatermark() {
  const W = 1050;
  const H = 680;
  const midX = W / 2;
  const midY = H / 2;
  const penD = 165;
  const penW = 403.2;
  const sixD = 55;
  const sixW = 183.2;
  const circleR = 91.5;
  const spot = 110;
  // Penalty arc: circle r=9.15 about spot, only the part outside the box
  const arcHalf = Math.acos(Math.min(1, (penD - spot) / circleR));
  const arcY = circleR * Math.sin(arcHalf);

  return (
    <svg
      className="league-hub-hero-watermark-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <rect x="16" y="16" width={W - 32} height={H - 32} rx="2" {...STROKE} />
      <line x1={midX} y1="16" x2={midX} y2={H - 16} {...STROKE} />
      <circle cx={midX} cy={midY} r={circleR} {...STROKE} />
      <circle cx={midX} cy={midY} r="5" fill="currentColor" stroke="none" />

      <rect
        x="16"
        y={midY - penW / 2}
        width={penD - 16}
        height={penW}
        {...STROKE}
      />
      <rect
        x="16"
        y={midY - sixW / 2}
        width={sixD - 16}
        height={sixW}
        {...STROKE}
      />
      <circle cx={spot} cy={midY} r="4" fill="currentColor" stroke="none" />
      <path
        d={`M ${penD} ${midY - arcY} A ${circleR} ${circleR} 0 0 1 ${penD} ${midY + arcY}`}
        {...STROKE}
      />

      <rect
        x={W - penD}
        y={midY - penW / 2}
        width={penD - 16}
        height={penW}
        {...STROKE}
      />
      <rect
        x={W - sixD}
        y={midY - sixW / 2}
        width={sixD - 16}
        height={sixW}
        {...STROKE}
      />
      <circle cx={W - spot} cy={midY} r="4" fill="currentColor" stroke="none" />
      <path
        d={`M ${W - penD} ${midY - arcY} A ${circleR} ${circleR} 0 0 0 ${W - penD} ${midY + arcY}`}
        {...STROKE}
      />
    </svg>
  );
}

function SportWatermark({ leagueId }: { leagueId: HubHeroLeagueId }) {
  switch (leagueId) {
    case "nba":
    case "cbb":
      return <BasketballCourtWatermark />;
    case "nhl":
      return <HockeyRinkWatermark />;
    case "nfl":
    case "cfb":
      return <FootballFieldWatermark />;
    case "epl":
      return <SoccerPitchWatermark />;
  }
}

/**
 * Full-bleed dark charcoal hub hero with per-league sport watermark.
 * Shared by slate, matrix, refs, teams, insights, and other category hubs.
 */
export function LeagueHubHero({
  leagueId,
  children,
  className,
  ...aria
}: LeagueHubHeroProps) {
  return (
    <section
      className={["league-hub-hero", className].filter(Boolean).join(" ")}
      data-league={leagueId}
      {...aria}
    >
      <div className="league-hub-hero-watermark" aria-hidden>
        <SportWatermark leagueId={leagueId} />
      </div>
      <div className="league-hub-hero-inner">{children}</div>
    </section>
  );
}
