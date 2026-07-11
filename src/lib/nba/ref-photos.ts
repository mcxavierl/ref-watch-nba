import refPhotosData from "../../../data/nba/ref-photos.json";

export interface RefPhotoEntry {
  thumbUrl: string;
  headshotUrl?: string;
}

const photos = (refPhotosData as { photos?: Record<string, RefPhotoEntry> })
  .photos ?? {};

export function nbaRefPhotoUrl(
  slug: string,
  size: "thumb" | "headshot" = "thumb",
): string | null {
  const entry = photos[slug];
  if (!entry) return null;
  if (size === "headshot" && entry.headshotUrl) return entry.headshotUrl;
  return entry.thumbUrl ?? null;
}

export function nbaRefPhotoCount(): number {
  return Object.keys(photos).length;
}
