import { VerifiedGamesHint } from "@/components/VerifiedGamesHint";

type TeamIndexSubtitleProps = {
  officialsCount: number;
  games: number;
  officialLabel?: string;
  gamesLabel?: string;
};

export function TeamIndexSubtitle({
  officialsCount,
  games,
  officialLabel = "officials",
  gamesLabel = "games",
}: TeamIndexSubtitleProps) {
  if (officialsCount > 0) {
    return (
      <>
        {officialsCount} {officialLabel} ·{" "}
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
