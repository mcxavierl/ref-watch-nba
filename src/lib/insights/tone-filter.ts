/**
 * Clinical Modern tone filter — neutral, analytical copy for dashboard headlines.
 */

const BANNED_PHRASES: readonly { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bhot\b/gi, replacement: "elevated" },
  { pattern: /\bcold\b/gi, replacement: "below baseline" },
  { pattern: /\bcrushing\b/gi, replacement: "leading" },
  { pattern: /\bdominat(?:ing|es|ed)\b/gi, replacement: "outperforming baseline" },
  { pattern: /\binsane\b/gi, replacement: "notable" },
  { pattern: /\bcrazy\b/gi, replacement: "statistically notable" },
  { pattern: /\bwild\b/gi, replacement: "material" },
  { pattern: /\bmonster\b/gi, replacement: "significant" },
  { pattern: /\bexplod(?:ing|es|ed)\b/gi, replacement: "trending above" },
  { pattern: /\bblow(?:s|ing)?\s+up\b/gi, replacement: "moving above" },
  { pattern: /\bsmash(?:ing|es|ed)?\b/gi, replacement: "exceeding" },
  { pattern: /\bkill(?:ing|s|ed)?\b/gi, replacement: "leading" },
  { pattern: /!/g, replacement: "." },
];

const CLINICAL_REPLACEMENTS: readonly { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bboosts\b/gi, replacement: "correlates with" },
  { pattern: /\bfavors\b/gi, replacement: "aligns with" },
  { pattern: /\bhurts\b/gi, replacement: "runs below" },
  { pattern: /\bimpacts\b/gi, replacement: "tracks with" },
  { pattern: /\bbeats\b/gi, replacement: "exceeds" },
  { pattern: /\btrails\b/gi, replacement: "runs below" },
  { pattern: /\bdrags\b/gi, replacement: "runs below" },
  { pattern: /\blargest\b/gi, replacement: "most pronounced" },
  { pattern: /\bbiggest\b/gi, replacement: "most pronounced" },
];

export function applyClinicalTone(text: string): string {
  let out = text.trim();
  for (const { pattern, replacement } of BANNED_PHRASES) {
    out = out.replace(pattern, replacement);
  }
  for (const { pattern, replacement } of CLINICAL_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  out = out.replace(/\s{2,}/g, " ");
  if (out.length > 0 && !/[.!?]$/.test(out)) {
    out = `${out}.`;
  }
  return out;
}

export function isClinicalTone(text: string): boolean {
  const normalized = text.toLowerCase();
  return !BANNED_PHRASES.some(({ pattern }) => {
    pattern.lastIndex = 0;
    return pattern.test(normalized);
  });
}
