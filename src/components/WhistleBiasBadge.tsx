import { STATE_CHIP_CLASS } from "@/constants/colors";
import { formatSigned } from "@/lib/data";
import type { WhistleBias } from "@/lib/types";

const teamTones = {
  raptors: {
    chip: STATE_CHIP_CLASS.risk,
  },
  lakers: {
    chip: "border-purple-200 bg-purple-50 text-purple-900",
  },
} as const;

const neutralStyles = {
  opponent: {
    chip: STATE_CHIP_CLASS.neutral,
    label: "More fouls on opponents",
  },
  neutral: {
    chip: STATE_CHIP_CLASS.neutral,
    label: "Roughly even fouls",
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
  const title = `Foul differential: ${formatSigned(diff)} per game`;

  if (bias === "team") {
    const tone = teamTones[teamTone];
    return (
      <span className={`status-chip ${tone.chip}`} title={title}>
        More fouls on {teamAbbr}
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
