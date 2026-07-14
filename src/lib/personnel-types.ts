/** Optional coach / star-player attachments on game-log rows. */

export interface CoachRef {
  coachId: string;
  name: string;
  team: string;
}

export interface PlayerFoulSnapshot {
  playerId: string;
  name: string;
  team: string;
  personalFouls?: number;
  foulsDrawn?: number;
  technicalFouls?: number;
}

export interface GamePersonnelSnapshot {
  homeCoach?: CoachRef;
  awayCoach?: CoachRef;
  activeStarPlayerIds?: string[];
  playerFouls?: PlayerFoulSnapshot[];
  homeTechnicalFouls?: number;
  awayTechnicalFouls?: number;
}
