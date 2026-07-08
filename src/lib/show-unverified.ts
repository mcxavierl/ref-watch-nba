/** Dev/staging preview gate for unverified league data. */

export function isShowUnverifiedEnv(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_UNVERIFIED === "true";
}

export function isPreviewQuery(searchParams?: {
  preview?: string | string[] | null;
}): boolean {
  const raw = searchParams?.preview;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "1" || value === "true";
}

export function shouldShowUnverifiedData(
  searchParams?: { preview?: string | string[] | null },
): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return isShowUnverifiedEnv() || isPreviewQuery(searchParams);
}
