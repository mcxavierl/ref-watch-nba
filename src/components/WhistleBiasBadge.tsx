import { formatSigned } from "@/lib/data";
import type { WhistleBias } from "@/lib/types";

const teamTones = {
  raptors: {
    chip: "border-red-200 bg-red-50 text-red-800",
  },
  lakers: {
    chip: "border-purple-200 bg-purple-50 text-purple-900",
  },
} as const;

const neutralStyles = {
  opponent: {
    chip: "border-sky-300 bg-sky-50 text-sky-800",
    label: "Opp lean",
  },
  neutral: {
    chip: "border-zinc-300 bg-zinc-100 text-zinc-700",
    label: "Balanced",
  },
} as const;

export function WhistleBiasBadge({
  bias,
  diff,
  teamAbbr = "TOR",
  teamTone = "raptors",
}: {
  bias: WhistleBias;
  diff: number;
  teamAbbr?: string;
  teamTone?: keyof typeof teamTones;
}) {
  const title = `Foul differential ${formatSigned(diff)} per game`;

  if (bias === "team") {
    const tone = teamTones[teamTone];
    return (
      <span className={`status-chip ${tone.chip}`} title={title}>
        {teamAbbr} whistle lean
      </span>
    );
  }

  const s = neutralStyles[bias];
  return (
    <span className={`status-chip ${s.chip}`} title={title}>
      {s.label}
    </span>
  );
}
