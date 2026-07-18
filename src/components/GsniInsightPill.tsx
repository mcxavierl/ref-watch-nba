import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { InsightBadge } from "@/components/hub/InsightBadge";

/** GSNI context metadata pill using the shared insight badge shell. */
export function GsniInsightPill({
  icon,
  children,
  className = "",
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return <InsightBadge label={children} icon={icon} className={className} />;
}
