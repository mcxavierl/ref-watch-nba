import { nhlRefPhotoUrl } from "@/lib/nhl/ref-photos";

export function refPhotoUrl(
  slug: string,
  sport: "nba" | "nhl",
  size: "thumb" | "headshot" = "thumb",
): string | null {
  if (sport === "nhl") return nhlRefPhotoUrl(slug, size);
  return null;
}

export function refInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
