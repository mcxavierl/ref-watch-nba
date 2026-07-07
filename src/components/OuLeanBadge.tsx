import type { OuLean } from "@/lib/types";
import { ouLeanDisplay } from "@/lib/user-language";

export function OuLeanBadge({ lean }: { lean: OuLean }) {
  const label = ouLeanDisplay(lean);
  const isDirectional = lean !== "neutral";

  return (
    <span
      className="ou-lean-badge"
      title={`Historical over lean: ${label}`}
    >
      <span className="ou-lean-badge-label">Over lean</span>
      <span
        className={`ou-lean-badge-value ${isDirectional ? "ou-lean-badge-value--directional" : ""}`}
      >
        {label}
      </span>
    </span>
  );
}
