import {
  formatGsni,
  gsniBand,
  gsniCaption,
  isExtremeGsni,
  type GsniBand,
} from "@/lib/gsni-display";

type GsniGaugeProps = {
  index: number;
  size?: "sm" | "md" | "lg";
  showCaption?: boolean;
  className?: string;
};

function glowClass(band: GsniBand, extreme: boolean): string {
  if (!extreme) return "";
  if (band === "quiet") {
    return "shadow-[0_0_22px_rgba(56,189,248,0.38)] ring-1 ring-sky-400/35";
  }
  return "shadow-[0_0_22px_rgba(251,146,60,0.42)] ring-1 ring-orange-400/35";
}

function barToneClass(band: GsniBand): string {
  if (band === "quiet") return "from-sky-400 to-cyan-300";
  if (band === "heavy") return "from-orange-400 to-amber-300";
  return "from-slate-400 to-slate-300";
}

export function GsniGauge({
  index,
  size = "md",
  showCaption = true,
  className = "",
}: GsniGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(index)));
  const band = gsniBand(clamped);
  const extreme = isExtremeGsni(clamped);

  const shellClass =
    size === "lg"
      ? "gap-3 p-3.5"
      : size === "sm"
        ? "gap-2 p-2"
        : "gap-2.5 p-3";

  const valueClass =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";

  return (
    <div
      className={`gsni-gauge whistle-index-gauge rounded-xl border border-border/70 bg-surface/90 ${shellClass} ${glowClass(band, extreme)} ${className}`}
      data-gsni={clamped}
      data-gsni-band={band}
      aria-label={`Game-State Index ${formatGsni(clamped)} out of 100. ${gsniCaption(clamped)}.`}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="whistle-index-gauge-label m-0 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            Game-State Index
          </p>
          <p
            className={`whistle-index-gauge-value m-0 font-bold tabular-nums leading-none text-zinc-100 ${valueClass}`}
          >
            {formatGsni(clamped)}
          </p>
        </div>
        <p className="m-0 text-[0.68rem] font-medium text-zinc-500">0–100</p>
      </div>

      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-zinc-800/80"
        aria-hidden
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barToneClass(band)} transition-[width] duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-zinc-950/70"
          style={{ left: "50%" }}
        />
      </div>

      {showCaption ? (
        <p className="m-0 text-xs font-medium text-zinc-400">{gsniCaption(clamped)}</p>
      ) : null}
    </div>
  );
}
