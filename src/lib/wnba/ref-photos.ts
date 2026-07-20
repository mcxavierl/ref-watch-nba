import refPhotosData from "../../../data/wnba/ref-photos.json";

export interface RefPhotoEntry {
  thumbUrl: string;
  headshotUrl?: string;
}

const photos = (refPhotosData as { photos?: Record<string, RefPhotoEntry> }).photos ?? {};

export function wnbaRefPhotoUrl(
  slug: string,
  size: "thumb" | "headshot" = "thumb",
): string | null {
  const entry = photos[slug];
  if (!entry) return null;
  if (size === "headshot" && entry.headshotUrl) return entry.headshotUrl;
  return entry.thumbUrl ?? null;
}

export function wnbaRefPhotoCount(): number {
  return Object.keys(photos).length;
}
