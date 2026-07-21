import type { DataLeague } from "@/lib/game-logs-preload";

/** Canonical node labels in the RefWatch knowledge graph. */
export type GraphNodeKind = "Official" | "Crew" | "Game" | "Team" | "Venue";

export interface GraphNodeBase {
  id: string;
  kind: GraphNodeKind;
}

export interface OfficialNode extends GraphNodeBase {
  kind: "Official";
  name: string;
  number: number;
}

export interface CrewNode extends GraphNodeBase {
  kind: "Crew";
  memberSlugs: string[];
}

export interface GameNode extends GraphNodeBase {
  kind: "Game";
  date: string;
  season: string;
  league: DataLeague;
  homeTeam: string;
  awayTeam: string;
  totalPoints: number;
  totalFouls: number;
  venueId: string;
}

export interface TeamNode extends GraphNodeBase {
  kind: "Team";
  abbr: string;
}

export interface VenueNode extends GraphNodeBase {
  kind: "Venue";
  homeTeam: string;
  league: DataLeague;
}

export type GraphNode =
  | OfficialNode
  | CrewNode
  | GameNode
  | TeamNode
  | VenueNode;

/** (Official)-[:PART_OF_CREW]->(Crew) */
export interface PartOfCrewEdge {
  type: "PART_OF_CREW";
  frequency: number;
  frictionDelta: number;
}

/** (Crew)-[:OFFICIATED]->(Game) */
export interface OfficiatedEdge {
  type: "OFFICIATED";
  date: string;
  foulsCalled: number;
  totalPoints: number;
}

/** (Game)-[:FEATURED_TEAM]->(Team) */
export interface FeaturedTeamEdge {
  type: "FEATURED_TEAM";
  isHome: boolean;
}

/** (Official)-[:OFFICIATED_TEAM]->(Team) */
export interface OfficiatedTeamEdge {
  type: "OFFICIATED_TEAM";
  gamesSample: number;
  winRate: number;
  foulDelta: number;
}

export type GraphEdge =
  | PartOfCrewEdge
  | OfficiatedEdge
  | FeaturedTeamEdge
  | OfficiatedTeamEdge;

export type GraphEdgeType = GraphEdge["type"];

/** Stable venue id when play-by-play venue ids are unavailable. */
export function venueIdForHomeTeam(league: DataLeague, homeTeam: string): string {
  return `venue:${league}:${homeTeam.toUpperCase()}`;
}

export function parseVenueId(venueId: string): { league: DataLeague; homeTeam: string } | null {
  const match = /^venue:([A-Z]+):([A-Z0-9]+)$/.exec(venueId);
  if (!match) return null;
  return {
    league: match[1] as DataLeague,
    homeTeam: match[2],
  };
}
