import type { ReactNode } from "react";
import { VERIFIED_GAMES_TOOLTIP } from "@/lib/game-count";

export function VerifiedGamesHint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span title={VERIFIED_GAMES_TOOLTIP} className={className}>
      {children}
    </span>
  );
}
