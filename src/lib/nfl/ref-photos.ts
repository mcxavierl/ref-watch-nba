import refPhotosData from "../../../data/nfl/ref-photos.json";

export interface RefPhotoEntry {
  thumbUrl: string;
  headshotUrl?: string;
  source?: string;
}

const photos = refPhotosData.photos as Record<string, RefPhotoEntry>;

export function nflRefPhotoUrl(
  slug: string,
  size: "thumb" | "headshot" = "thumb",
): string | null {
  const entry = photos[slug];
  if (!entry) return null;
  if (size === "headshot" && entry.headshotUrl) return entry.headshotUrl;
  return entry.thumbUrl ?? null;
}

export function nflRefPhotoCount(): number {
  return Object.keys(photos).length;
}
