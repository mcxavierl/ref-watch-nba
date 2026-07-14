import { WorldCupMethodologyCard } from "@/components/WorldCupMethodologyCard";
import { WorldCupResearchHubCard } from "@/components/WorldCupResearchHubCard";
import { hubPageMetadata } from "@/lib/seo";
import { WC_RESEARCH_HUB } from "@/lib/world-cup-research";

export const metadata = hubPageMetadata("nba", "research");

export default function WorldCupResearchPage() {
  return (
    <main className="page-shell">
      <div className="page-header">
        <p className="page-eyebrow">{WC_RESEARCH_HUB.kicker}</p>
        <h1 className="page-title">{WC_RESEARCH_HUB.title}</h1>
        <p className="page-lead">{WC_RESEARCH_HUB.story}</p>
      </div>

      <div className="wc-research-page-grid">
        <WorldCupResearchHubCard />
        <WorldCupMethodologyCard />
      </div>
    </main>
  );
}
