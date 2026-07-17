import type { Finding } from "@/lib/findings-shared";

export type WcCardGlow = "rose" | "emerald" | "neutral";

/** Ambient pill-row glow tier for World Cup analytics capsules. */
export function worldCupCardGlow(finding: Finding): WcCardGlow {
  if (finding.id === "wc-final-argentina-comebacks") {
    return "emerald";
  }

  if (finding.id === "wc-final-ref-cards" || finding.id === "wc-final-spain-defense") {
    return "rose";
  }

  return "neutral";
}
