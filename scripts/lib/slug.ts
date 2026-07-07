export function refSlug(name: string, number: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${number}`;
}

export function parseRefFromCell(cell: string): { name: string; number: number } {
  const trimmed = cell.replace(/\s+/g, " ").trim();
  const match = trimmed.match(/^(.+?)\s*\(#(\d+)\)/);
  if (!match) {
    return { name: trimmed, number: 0 };
  }
  return { name: match[1].trim(), number: Number.parseInt(match[2], 10) };
}

export function crewKey(refs: { name: string; number: number }[]): string {
  return refs
    .map((r) => refSlug(r.name, r.number))
    .sort()
    .join("|");
}
