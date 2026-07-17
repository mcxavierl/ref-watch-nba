import { GameStateIndexFindingsView } from "@/components/clutch-consistency/GameStateIndexFindingsView";
import { loadGsniHomeFindings } from "@/lib/gsni-home-findings";

export function GameStateIndexFindings() {
  const findings = loadGsniHomeFindings();
  if (findings.length === 0) return null;

  return <GameStateIndexFindingsView findings={findings} />;
}
