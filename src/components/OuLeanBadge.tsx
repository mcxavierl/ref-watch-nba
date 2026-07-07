import type { OuLean } from "@/lib/types";
import { ouLeanDisplay } from "@/lib/user-language";

export function OuLeanBadge({ lean }: { lean: OuLean }) {
  const label = ouLeanDisplay(lean);
  const isDirectional = lean !== "neutral";

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800"
      title={`Historical over lean: ${label}`}
    >
      <span className="font-normal text-zinc-500">Historical over lean:</span>
      <span className={isDirectional ? "font-bold tabular-nums" : "tabular-nums"}>
        {label}
      </span>
    </span>
  );
}
