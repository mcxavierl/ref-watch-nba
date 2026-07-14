import Link from "next/link";
import { classifyRankingSignalPattern } from "@/lib/ranking-signal-pattern";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";

/** Single primary pattern pill for a ranking table row: asymmetric / high-variance / stable. */
export function RankingSignalPill({
  officialRef,
  leagueId,
  signalCount,
  profileHref,
}: {
  officialRef: RefProfile;
  leagueId: LeagueId;
  signalCount: number;
  profileHref: string;
}) {
  const pattern = classifyRankingSignalPattern(officialRef, leagueId, signalCount);
  const className = `ranking-signal-pill ranking-signal-pill--${pattern.kind}`;

  if (pattern.kind === "stable") {
    return <span className={className}>{pattern.label}</span>;
  }

  return (
    <Link
      href={`${profileHref}#profile-signals`}
      className={`${className} ranking-signal-pill--link shrink-0 whitespace-nowrap`}
    >
      {pattern.label}
    </Link>
  );
}
