import type { LeagueManifestId } from "@/lib/league-manifest";

type PageModule = {
  default: (props: any) => Promise<React.ReactNode> | React.ReactNode;
  generateMetadata?: (props: any) => Promise<unknown> | unknown;
  generateStaticParams?: () => Array<Record<string, string>>;
};

export async function importMatrixPage(leagueId: LeagueManifestId): Promise<PageModule> {
  switch (leagueId) {
    case "nba":
      return import("@/lib/league-pages/nba-matrix");
    case "nhl":
      return import("@/lib/league-pages/nhl-matrix");
    case "nfl":
      return import("@/lib/league-pages/nfl-matrix");
    case "epl":
      return import("@/lib/league-pages/epl-matrix");
    case "laliga":
      return import("@/lib/league-pages/laliga-matrix");
    case "cbb":
      return import("@/lib/league-pages/cbb-matrix");
    case "cfb":
      return import("@/lib/league-pages/cfb-matrix");
    default:
      throw new Error(`No matrix page for ${leagueId}`);
  }
}

export async function importTeamsPage(leagueId: LeagueManifestId): Promise<PageModule> {
  switch (leagueId) {
    case "nba":
      return import("@/lib/league-pages/nba-teams");
    case "nhl":
      return import("@/lib/league-pages/nhl-teams");
    case "nfl":
      return import("@/lib/league-pages/nfl-teams");
    case "epl":
      return import("@/lib/league-pages/epl-teams");
    case "laliga":
      return import("@/lib/league-pages/laliga-teams");
    case "cbb":
      return import("@/lib/league-pages/cbb-teams");
    case "cfb":
      return import("@/lib/league-pages/cfb-teams");
    default:
      throw new Error(`No teams page for ${leagueId}`);
  }
}

export async function importTeamProfilePage(leagueId: LeagueManifestId): Promise<PageModule> {
  switch (leagueId) {
    case "nba":
      return import("@/lib/league-pages/nba-team-profile");
    case "nhl":
      return import("@/lib/league-pages/nhl-team-profile");
    case "nfl":
      return import("@/lib/league-pages/nfl-team-profile");
    case "epl":
      return import("@/lib/league-pages/epl-team-profile");
    case "laliga":
      return import("@/lib/league-pages/laliga-team-profile");
    case "cbb":
      return import("@/lib/league-pages/cbb-team-profile");
    case "cfb":
      return import("@/lib/league-pages/cfb-team-profile");
    default:
      throw new Error(`No team profile page for ${leagueId}`);
  }
}

export async function importRefProfilePage(leagueId: LeagueManifestId): Promise<PageModule> {
  switch (leagueId) {
    case "nba":
      return import("@/lib/league-pages/nba-ref-profile");
    case "nhl":
      return import("@/lib/league-pages/nhl-ref-profile");
    case "nfl":
      return import("@/lib/league-pages/nfl-ref-profile");
    case "epl":
      return import("@/lib/league-pages/epl-ref-profile");
    case "laliga":
      return import("@/lib/league-pages/laliga-ref-profile");
    case "cbb":
      return import("@/lib/league-pages/cbb-ref-profile");
    case "cfb":
      return import("@/lib/league-pages/cfb-ref-profile");
    default:
      throw new Error(`No ref profile page for ${leagueId}`);
  }
}
