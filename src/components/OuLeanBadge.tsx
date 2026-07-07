import type { OuLean } from "@/lib/types";

const styles: Record<
  OuLean,
  { chip: string; dot: string; label: string }
> = {
  over: {
    chip: "border-emerald-300 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-600",
    label: "Over lean",
  },
  under: {
    chip: "border-rose-300 bg-rose-50 text-rose-800",
    dot: "bg-rose-600",
    label: "Under lean",
  },
  neutral: {
    chip: "border-zinc-300 bg-zinc-100 text-zinc-700",
    dot: "bg-zinc-500",
    label: "Neutral",
  },
};

export function OuLeanBadge({ lean }: { lean: OuLean }) {
  const s = styles[lean];
  return (
    <span
      className={`status-chip ${s.chip}`}
      title={`O/U lean: ${s.label}`}
    >
      <span className={`size-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
