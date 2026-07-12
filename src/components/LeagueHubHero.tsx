import type { ReactNode } from "react";
import type { LeagueId } from "@/lib/leagues";

/** Leagues with sport-watermark hub heroes (court / rink / field / pitch). */
export type HubHeroLeagueId = Extract<
  LeagueId,
  "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"
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
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

const STROKE_CRISP = {
  ...STROKE,
  strokeWidth: 1.15,
  strokeOpacity: 0.88,
};

const RINK_RED = {
  stroke: "var(--sport-line-red, #fca5a5)",
  strokeOpacity: 0.55,
};

const RINK_BLUE = {
  stroke: "var(--sport-line-blue, #93c5fd)",
  strokeOpacity: 0.5,
};

function WatermarkClip({
  id,
  x,
  y,
  width,
  height,
  rx = 0,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}) {
  return (
    <clipPath id={id}>
      <rect x={x} y={y} width={width} height={height} rx={rx} ry={rx} />
    </clipPath>
  );
}

/**
 * NBA court in feet (94×50). Basket 5.25' from baseline; key 16×19;
 * FT circle r=6 nested inside 3PT arc (r=23.75 from basket, corners at 22').
 */
function BasketballCourtWatermark() {
  // Scale: 10 units = 1 foot → viewBox 940×500
  const W = 940;
  const H = 500;
  const pad = 8;
  const midX = W / 2;
  const midY = H / 2;
  const basketL = 52.5; // 5.25 ft
  const basketR = W - basketL;
  const keyDepth = 190; // 19 ft
  const keyHalf = 80; // 8 ft (16 ft lane)
  const ftR = 60; // 6 ft
  const threeR = 237.5; // 23.75 ft
  const cornerInset = 30; // 3 ft from sideline
  const threeJoin = Math.sqrt(threeR * threeR - (midY - cornerInset) ** 2);
  const threeJoinL = basketL + threeJoin;
  const threeJoinR = basketR - threeJoin;
  const clipId = "rw-nba-court-clip";

  return (
    <svg
      className="league-hub-hero-watermark-svg league-hub-hero-watermark-svg--nba"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <WatermarkClip
          id={clipId}
          x={pad}
          y={pad}
          width={W - pad * 2}
          height={H - pad * 2}
          rx={2}
        />
      </defs>
      <rect
        x={pad}
        y={pad}
        width={W - pad * 2}
        height={H - pad * 2}
        rx="2"
        {...STROKE}
        strokeWidth={1.4}
        strokeOpacity={0.95}
      />
      <g clipPath={`url(#${clipId})`}>
        <line x1={midX} y1={pad} x2={midX} y2={H - pad} {...STROKE_CRISP} />
        <circle cx={midX} cy={midY} r="60" {...STROKE_CRISP} />

        <rect
          x={pad}
          y={midY - keyHalf}
          width={keyDepth - pad}
          height={keyHalf * 2}
          {...STROKE_CRISP}
        />
        <path
          d={`M ${keyDepth} ${midY - ftR} A ${ftR} ${ftR} 0 0 1 ${keyDepth} ${midY + ftR}`}
          {...STROKE_CRISP}
        />
        <circle cx={basketL} cy={midY} r="40" {...STROKE_CRISP} />
        <circle cx={basketL} cy={midY} r="6" {...STROKE_CRISP} />
        <path
          d={[
            `M ${pad} ${cornerInset}`,
            `L ${threeJoinL} ${cornerInset}`,
            `A ${threeR} ${threeR} 0 0 1 ${threeJoinL} ${H - cornerInset}`,
            `L ${pad} ${H - cornerInset}`,
          ].join(" ")}
          {...STROKE_CRISP}
        />

        <rect
          x={W - keyDepth}
          y={midY - keyHalf}
          width={keyDepth - pad}
          height={keyHalf * 2}
          {...STROKE_CRISP}
        />
        <path
          d={`M ${W - keyDepth} ${midY - ftR} A ${ftR} ${ftR} 0 0 0 ${W - keyDepth} ${midY + ftR}`}
          {...STROKE_CRISP}
        />
        <circle cx={basketR} cy={midY} r="40" {...STROKE_CRISP} />
        <circle cx={basketR} cy={midY} r="6" {...STROKE_CRISP} />
        <path
          d={[
            `M ${W - pad} ${cornerInset}`,
            `L ${threeJoinR} ${cornerInset}`,
            `A ${threeR} ${threeR} 0 0 0 ${threeJoinR} ${H - cornerInset}`,
            `L ${W - pad} ${H - cornerInset}`,
          ].join(" ")}
          {...STROKE_CRISP}
        />
      </g>
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
  const pad = 20;
  const r = 280; // 28' corner radius
  const iceW = W - pad * 2;
  const iceH = H - pad * 2;
  const midX = W / 2;
  const midY = H / 2;
  const goalL = 110;
  const goalR = W - 110;
  const blueL = 750;
  const blueR = W - 750;
  const faceR = 150;
  const creaseR = 60;
  const dotR = 10;
  const faceX1 = goalL + 200;
  const faceX2 = goalR - 200;
  const faceY1 = midY - 220;
  const faceY2 = midY + 220;
  const clipId = "rw-nhl-rink-clip";

  return (
    <svg
      className="league-hub-hero-watermark-svg league-hub-hero-watermark-svg--nhl"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <WatermarkClip id={clipId} x={pad} y={pad} width={iceW} height={iceH} rx={r} />
      </defs>
      {/* Ice surface tint */}
      <rect
        x={pad}
        y={pad}
        width={iceW}
        height={iceH}
        rx={r}
        ry={r}
        fill="var(--sport-surface-tint, rgba(186, 230, 253, 0.08))"
        stroke="none"
      />
      {/* Boards */}
      <rect
        x={pad}
        y={pad}
        width={iceW}
        height={iceH}
        rx={r}
        ry={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.65}
        vectorEffect="non-scaling-stroke"
      />
      <g clipPath={`url(#${clipId})`}>
        {/* Center red line */}
        <line
          x1={midX}
          y1={pad}
          x2={midX}
          y2={H - pad}
          {...STROKE}
          strokeWidth={1.7}
          {...RINK_RED}
        />
        <line
          x1={blueL}
          y1={pad}
          x2={blueL}
          y2={H - pad}
          {...STROKE}
          strokeWidth={1.5}
          {...RINK_BLUE}
        />
        <line
          x1={blueR}
          y1={pad}
          x2={blueR}
          y2={H - pad}
          {...STROKE}
          strokeWidth={1.5}
          {...RINK_BLUE}
        />
        <line
          x1={goalL}
          y1={pad}
          x2={goalL}
          y2={H - pad}
          {...STROKE}
          strokeWidth={1.4}
          {...RINK_RED}
        />
        <line
          x1={goalR}
          y1={pad}
          x2={goalR}
          y2={H - pad}
          {...STROKE}
          strokeWidth={1.4}
          {...RINK_RED}
        />

        <circle cx={midX} cy={midY} r={faceR} {...STROKE_CRISP} />
        <circle cx={midX} cy={midY} r="12" fill="currentColor" stroke="none" opacity={0.35} />

        {[
          [(blueL + midX) / 2, faceY1],
          [(blueL + midX) / 2, faceY2],
          [(blueR + midX) / 2, faceY1],
          [(blueR + midX) / 2, faceY2],
          [faceX1, faceY1],
          [faceX1, faceY2],
          [faceX2, faceY1],
          [faceX2, faceY2],
        ].map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={dotR}
            fill="currentColor"
            stroke="none"
            opacity={0.38}
          />
        ))}

        <circle cx={faceX1} cy={faceY1} r={faceR} {...STROKE_CRISP} />
        <circle cx={faceX1} cy={faceY2} r={faceR} {...STROKE_CRISP} />
        <circle cx={faceX2} cy={faceY1} r={faceR} {...STROKE_CRISP} />
        <circle cx={faceX2} cy={faceY2} r={faceR} {...STROKE_CRISP} />

        {/* Goal creases */}
        <path
          d={`M ${goalL} ${midY - creaseR} A ${creaseR} ${creaseR} 0 0 1 ${goalL} ${midY + creaseR}`}
          {...STROKE}
          strokeWidth={1.3}
          {...RINK_RED}
        />
        <path
          d={`M ${goalR} ${midY - creaseR} A ${creaseR} ${creaseR} 0 0 0 ${goalR} ${midY + creaseR}`}
          {...STROKE}
          strokeWidth={1.3}
          {...RINK_RED}
        />
        {/* Trapezoid behind goal (simplified) */}
        <path
          d={`M ${goalL} ${pad + 80} L ${goalL + 140} ${midY - 180} L ${goalL + 140} ${midY + 180} L ${goalL} ${H - pad - 80}`}
          {...STROKE_CRISP}
          strokeOpacity={0.35}
        />
        <path
          d={`M ${goalR} ${pad + 80} L ${goalR - 140} ${midY - 180} L ${goalR - 140} ${midY + 180} L ${goalR} ${H - pad - 80}`}
          {...STROKE_CRISP}
          strokeOpacity={0.35}
        />
      </g>
    </svg>
  );
}

/**
 * American football field: 100 yd + two 10 yd end zones × 53⅓ yd.
 */
function FootballFieldWatermark() {
  const W = 1200; // 120 yards × 10
  const H = 533; // 53.3 yards × 10
  const pad = 12;
  const end = 100;
  const hashInset = 123;
  const clipId = "rw-nfl-field-clip";

  const yardLines = [];
  for (let y = 10; y <= 110; y += 5) {
    const x = y * 10;
    yardLines.push(
      <line
        key={y}
        x1={x}
        y1={pad}
        x2={x}
        y2={H - pad}
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
        <line x1={x} y1={hashInset} x2={x} y2={hashInset + 14} {...STROKE} strokeWidth="1.1" />
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
      className="league-hub-hero-watermark-svg league-hub-hero-watermark-svg--nfl"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <WatermarkClip id={clipId} x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} rx={4} />
      </defs>
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} rx="4" {...STROKE} strokeWidth={1.4} strokeOpacity={0.8} />
      <g clipPath={`url(#${clipId})`}>
        {/* Field surface tint */}
        <rect
          x={pad}
          y={pad}
          width={W - pad * 2}
          height={H - pad * 2}
          fill="var(--sport-surface-tint, rgba(52, 211, 153, 0.06))"
          stroke="none"
        />
        <rect
          x={pad}
          y={pad}
          width={end - pad}
          height={H - pad * 2}
          fill="currentColor"
          opacity={0.05}
          stroke="none"
        />
        <rect
          x={W - end}
          y={pad}
          width={end - pad}
          height={H - pad * 2}
          fill="currentColor"
          opacity={0.05}
          stroke="none"
        />
        <line x1={end} y1={pad} x2={end} y2={H - pad} {...STROKE} strokeWidth="1.6" strokeOpacity={0.75} />
        <line x1={W - end} y1={pad} x2={W - end} y2={H - pad} {...STROKE} strokeWidth="1.6" strokeOpacity={0.75} />
        <line x1={W / 2} y1={pad} x2={W / 2} y2={H - pad} {...STROKE} strokeWidth="1.6" strokeOpacity={0.75} />
        {yardLines}
        {hashes}
      </g>
    </svg>
  );
}

/**
 * Soccer pitch ~105×68 m. Penalty 16.5×40.32; six-yard 5.5×18.32; circle r=9.15.
 */
function SoccerPitchWatermark() {
  const W = 1050;
  const H = 680;
  const pad = 16;
  const midX = W / 2;
  const midY = H / 2;
  const penD = 165;
  const penW = 403.2;
  const sixD = 55;
  const sixW = 183.2;
  const circleR = 91.5;
  const spot = 110;
  const cornerR = 10; // 1 m
  const arcHalf = Math.acos(Math.min(1, (penD - spot) / circleR));
  const arcY = circleR * Math.sin(arcHalf);
  const clipId = "rw-soccer-pitch-clip";

  const cornerArc = (cx: number, cy: number, sweep: 0 | 1) => (
    <path
      d={`M ${cx} ${cy + (cy < midY ? cornerR : -cornerR)} A ${cornerR} ${cornerR} 0 0 ${sweep} ${cx + (cx < midX ? cornerR : -cornerR)} ${cy}`}
      {...STROKE}
    />
  );

  return (
    <svg
      className="league-hub-hero-watermark-svg league-hub-hero-watermark-svg--soccer"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <WatermarkClip id={clipId} x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} rx={2} />
      </defs>
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} rx="2" {...STROKE} strokeWidth={1.4} strokeOpacity={0.8} />
      <g clipPath={`url(#${clipId})`}>
        {/* Pitch surface tint */}
        <rect
          x={pad}
          y={pad}
          width={W - pad * 2}
          height={H - pad * 2}
          fill="var(--sport-surface-tint, rgba(52, 211, 153, 0.05))"
          stroke="none"
        />
        <line x1={midX} y1={pad} x2={midX} y2={H - pad} {...STROKE_CRISP} />
        <circle cx={midX} cy={midY} r={circleR} {...STROKE_CRISP} />
        <circle cx={midX} cy={midY} r="5" fill="currentColor" stroke="none" opacity={0.38} />

        <rect x={pad} y={midY - penW / 2} width={penD - pad} height={penW} {...STROKE_CRISP} />
        <rect x={pad} y={midY - sixW / 2} width={sixD - pad} height={sixW} {...STROKE_CRISP} />
        <circle cx={spot} cy={midY} r="4" fill="currentColor" stroke="none" opacity={0.38} />
        <path
          d={`M ${penD} ${midY - arcY} A ${circleR} ${circleR} 0 0 1 ${penD} ${midY + arcY}`}
          {...STROKE_CRISP}
        />

        <rect
          x={W - penD}
          y={midY - penW / 2}
          width={penD - pad}
          height={penW}
          {...STROKE_CRISP}
        />
        <rect
          x={W - sixD}
          y={midY - sixW / 2}
          width={sixD - pad}
          height={sixW}
          {...STROKE_CRISP}
        />
        <circle cx={W - spot} cy={midY} r="4" fill="currentColor" stroke="none" opacity={0.38} />
        <path
          d={`M ${W - penD} ${midY - arcY} A ${circleR} ${circleR} 0 0 0 ${W - penD} ${midY + arcY}`}
          {...STROKE_CRISP}
        />

        {cornerArc(pad, pad, 0)}
        {cornerArc(W - pad, pad, 1)}
        {cornerArc(pad, H - pad, 1)}
        {cornerArc(W - pad, H - pad, 0)}
      </g>
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
    case "laliga":
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
