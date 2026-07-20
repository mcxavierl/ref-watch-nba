import { PrefetchLink } from "@/components/PrefetchLink";
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
    <PrefetchLink
      href={`/compare?a=${encodeURIComponent(encodeCompareRef(leagueId, slug))}`}
      className={className ?? "ref-compare-entry-link"}
      prefetch={true}
    >
      Compare
    </PrefetchLink>
  );
}
