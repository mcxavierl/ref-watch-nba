import refPhotosData from "../../../data/nhl/ref-photos.json";

export interface RefPhotoEntry {
  thumbUrl: string;
  headshotUrl?: string;
}

const photos = refPhotosData.photos as Record<string, RefPhotoEntry>;

export function nhlRefPhotoUrl(
  slug: string,
  size: "thumb" | "headshot" = "thumb",
): string | null {
  const entry = photos[slug];
  if (!entry) return null;
  if (size === "headshot" && entry.headshotUrl) return entry.headshotUrl;
  return entry.thumbUrl ?? null;
}

export function nhlRefPhotoCount(): number {
  return Object.keys(photos).length;
}
