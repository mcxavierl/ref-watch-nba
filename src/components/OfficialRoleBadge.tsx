import type { RefRole } from "@/lib/types";
import { officialRoleBadgeLabel } from "@/lib/nhl/officials";

export function OfficialRoleBadge({ role }: { role?: RefRole }) {
  const label = officialRoleBadgeLabel(role);
  if (!label) return null;

  return (
    <span className="official-role-badge" aria-label="Linesman">
      {label}
    </span>
  );
}
