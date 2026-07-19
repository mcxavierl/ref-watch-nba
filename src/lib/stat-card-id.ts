/** Stable URL hash segment for a stat card anchor. */
export function statCardHashId(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Full share URL for the current page with a stat-card hash. */
export function statCardShareUrl(hashId: string): string {
  if (typeof window === "undefined") return `#${hashId}`;
  const url = new URL(window.location.href);
  url.hash = hashId;
  return url.toString();
}
