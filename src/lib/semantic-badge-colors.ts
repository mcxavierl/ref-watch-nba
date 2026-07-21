/**
 * Semantic badge / pill color utilities.
 * Reserve accent hues for meaning, not decoration.
 */

export type SemanticBadgeRole =
  | "confidence"
  | "anomaly"
  | "baseline"
  | "research";

export const SEMANTIC_BADGE_TEXT_CLASS: Record<SemanticBadgeRole, string> = {
  confidence: "text-emerald-400",
  anomaly: "text-amber-400",
  baseline: "text-slate-300",
  research: "text-purple-400",
};

export const SEMANTIC_BADGE_SURFACE_CLASS: Record<SemanticBadgeRole, string> = {
  confidence: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  anomaly: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  baseline: "bg-slate-800/40 text-slate-300 border border-slate-700/40",
  research: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
};

export const SEMANTIC_BADGE_CYAN_TEXT = "text-cyan-400";

export function semanticBadgeTextClass(role: SemanticBadgeRole): string {
  return SEMANTIC_BADGE_TEXT_CLASS[role];
}

export function semanticBadgeSurfaceClass(role: SemanticBadgeRole): string {
  return SEMANTIC_BADGE_SURFACE_CLASS[role];
}

/** Map insight hero tone to semantic badge role. */
export function insightToneToSemanticRole(
  tone: "positive" | "negative" | "neutral",
): SemanticBadgeRole {
  if (tone === "positive") return "confidence";
  if (tone === "negative") return "anomaly";
  return "baseline";
}
