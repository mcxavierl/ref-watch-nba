/** Append a provenance sentence once; follows the clear, plain-language record-keeping standard for meta.note. */
export function appendMetaNoteOnce(
  existing: string | undefined,
  sentence: string,
): string {
  const trimmed = sentence.trim();
  if (!trimmed) return (existing ?? "").trim();
  const base = (existing ?? "").trim();
  if (!base) return trimmed;
  if (base.includes(trimmed)) return base;
  return `${base} ${trimmed}`.trim();
}

/** Collapse repeated sentences in ingest notes (belt-and-suspenders for display). */
export function dedupeMetaNoteSentences(note: string): string {
  const sentences = note
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set(sentences)].join(" ");
}
