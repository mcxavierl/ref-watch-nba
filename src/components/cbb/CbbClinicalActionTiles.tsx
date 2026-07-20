import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { insightsViewHref } from "@/lib/insights-routes";
import { leagueHref } from "@/lib/leagues";
import "./cbb-clinical.css";

const CBB_ACTION_TILES = [
  {
    href: insightsViewHref("cbb", "tendencies"),
    title: "Tendency index",
    description: "Scoring and foul rates by referee across indexed crews.",
  },
  {
    href: leagueHref("cbb", "/matrix"),
    title: "Ref matrix",
    description: "Game-by-game crew coverage grid for tracked conferences.",
  },
  {
    href: leagueHref("cbb", "/teams"),
    title: "Team histories",
    description: "Crew splits for ACC, Big Ten, SEC, Big 12, and Big East programs.",
  },
  {
    href: "#dataset-findings",
    title: "Season highlights",
    description: "Strong-confidence patterns from off-season seed data.",
  },
] as const;

export function CbbClinicalActionTiles() {
  return (
    <nav className="cbb-clinical-action-grid" aria-label="Explore historical analytics">
      {CBB_ACTION_TILES.map((tile) => (
        <Link key={tile.href} href={tile.href} className="cbb-clinical-action-tile">
          <span className="cbb-clinical-action-head">
            <span className="cbb-clinical-action-title">{tile.title}</span>
            <ArrowRight className="cbb-clinical-action-arrow" aria-hidden />
          </span>
          <span className="cbb-clinical-action-desc">{tile.description}</span>
        </Link>
      ))}
    </nav>
  );
}
