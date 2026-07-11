const refPhotos: Record<string, string> = {};

export function laligaRefPhotoUrl(
  slug: string,
  _name?: string,
): string | undefined {
  return refPhotos[slug];
}

export function laligaRefPhotoCount(): number {
  return Object.keys(refPhotos).length;
}
