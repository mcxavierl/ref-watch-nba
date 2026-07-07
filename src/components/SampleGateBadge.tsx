import type { SampleGateStatus } from "@/lib/types";

export function SampleGateBadge({
  gate,
  className = "",
}: {
  gate?: SampleGateStatus;
  className?: string;
}) {
  if (!gate) return null;

  return (
    <span
      className={`inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium ${
        gate.cleared
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
          : "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
      } ${className}`}
    >
      {gate.label}
    </span>
  );
}
