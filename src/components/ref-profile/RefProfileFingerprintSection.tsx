import { OfficiatingFingerprint } from "@/components/visuals/OfficiatingFingerprint";
import { buildOfficiatingFingerprint } from "@/lib/analytics/officiating-fingerprint";
import type { LeagueId } from "@/lib/leagues";
import type { RefProfile, RefStatsFile } from "@/lib/types";

type RefProfileFingerprintSectionProps = {
  leagueId: LeagueId;
  profile: RefProfile;
  stats: RefStatsFile;
  qualified: boolean;
};

export function RefProfileFingerprintSection({
  leagueId,
  profile,
  stats,
  qualified,
}: RefProfileFingerprintSectionProps) {
  const fingerprint = buildOfficiatingFingerprint(
    leagueId,
    profile,
    stats,
    qualified,
  );
  if (!fingerprint) return null;

  return (
    <section className="ref-profile-fingerprint section-block" aria-label="Officiating fingerprint">
      <OfficiatingFingerprint data={fingerprint} />
    </section>
  );
}
