import Link from "next/link";
import { encodeCompareRef } from "@/lib/ref-compare";
import type { LeagueId } from "@/lib/leagues";

export function RefCompareLink({
  leagueId,
  slug,
  className,
}: {
  leagueId: LeagueId;
  slug: string;
  className?: string;
}) {
  return (
    <Link
      href={`/compare?a=${encodeURIComponent(encodeCompareRef(leagueId, slug))}`}
      className={className ?? "ref-compare-entry-link"}
    >
      Compare
    </Link>
  );
}
