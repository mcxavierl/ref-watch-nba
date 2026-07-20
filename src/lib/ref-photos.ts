import { nbaRefPhotoUrl } from "@/lib/nba/ref-photos";
import { nhlRefPhotoUrl } from "@/lib/nhl/ref-photos";
import { nflRefPhotoUrl } from "@/lib/nfl/ref-photos";
import { eplRefPhotoUrl } from "@/lib/epl/ref-photos";
import { laligaRefPhotoUrl } from "@/lib/laliga/ref-photos";
import { cbbRefPhotoUrl } from "@/lib/cbb/ref-photos";
import { wnbaRefPhotoUrl } from "@/lib/wnba/ref-photos";
import { cfbRefPhotoUrl } from "@/lib/cfb/ref-photos";

export function refPhotoUrl(
  slug: string,
  sport: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "wnba" | "cfb",
  size: "thumb" | "headshot" = "thumb",
): string | null {
  if (sport === "nba") return nbaRefPhotoUrl(slug, size);
  if (sport === "nhl") return nhlRefPhotoUrl(slug, size);
  if (sport === "nfl") return nflRefPhotoUrl(slug, size);
  if (sport === "epl") return eplRefPhotoUrl(slug, size);
  if (sport === "laliga") return laligaRefPhotoUrl(slug, size);
  if (sport === "cbb") return cbbRefPhotoUrl(slug, size);
  if (sport === "wnba") return wnbaRefPhotoUrl(slug, size);
  if (sport === "cfb") return cfbRefPhotoUrl(slug, size);
  return null;
}
