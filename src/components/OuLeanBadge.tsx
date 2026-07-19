import type { OuLean } from "@/lib/types";
import { ouLeanDisplay } from "@/lib/user-language";

export function OuLeanBadge({ lean }: { lean: OuLean }) {
  const label = ouLeanDisplay(lean);
  const isDirectional = lean !== "neutral";

  return (
    <span
      className="ou-lean-badge pill-constrain"
      title={`Historical over-rate tendency: ${label}`}
    >
      <span className="ou-lean-badge-label pill-constrain-text">Over tendency</span>
      <span
        className={`ou-lean-badge-value ${isDirectional ? "ou-lean-badge-value--directional" : ""}`}
      >
        {label}
      </span>
    </span>
  );
}
