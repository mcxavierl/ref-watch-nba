import { VerifiedGamesHint } from "@/components/VerifiedGamesHint";

type TeamIndexSubtitleProps = {
  splitsCount: number;
  games: number;
  crewLabel?: string;
  gamesLabel?: string;
};

export function TeamIndexSubtitle({
  splitsCount,
  games,
  crewLabel = "crews",
  gamesLabel = "games",
}: TeamIndexSubtitleProps) {
  if (splitsCount > 0) {
    return (
      <>
        {splitsCount} {crewLabel} ·{" "}
        <VerifiedGamesHint>
          {games} {gamesLabel}
        </VerifiedGamesHint>
      </>
    );
  }
  if (games > 0) {
    return (
      <VerifiedGamesHint>
        {games} {gamesLabel}
      </VerifiedGamesHint>
    );
  }
  return "No data yet";
}
