import Link from "next/link";
import { classifyRankingSignalPattern } from "@/lib/ranking-signal-pattern";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile } from "@/lib/types";
import { Pill } from "@/components/ui/Pill";

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
  const className = `ranking-signal-pill--${pattern.kind}`;

  if (pattern.kind === "stable") {
    return (
      <Pill variant="signal" className={className}>
        {pattern.label}
      </Pill>
    );
  }

  return (
    <Link
      href={`${profileHref}#profile-signals`}
      className={`pill-constrain ranking-signal-pill ${className} ranking-signal-pill--link`}
    >
      <span className="pill-constrain-text">{pattern.label}</span>
    </Link>
  );
}
