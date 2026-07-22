import { getLiveSlateGames } from "@/lib/live-slate-engine";
import type { LeagueId } from "@/lib/leagues";
import { LEAGUES } from "@/lib/leagues";
import { mergeSlateLiveCrews, fetchSlateLiveCrews } from "@/lib/slate-live-crews";
import { fetchSlateLiveScores, mergeSlateLiveScores } from "@/lib/slate-live-scores";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_CACHE_CONTROL =
  "no-store, no-cache, must-revalidate, proxy-revalidate";

function parseLeagueId(value: string | null): LeagueId | undefined {
  if (!value) return undefined;
  return value in LEAGUES ? (value as LeagueId) : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = parseLeagueId(searchParams.get("league"));
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  const slate = getLiveSlateGames({
    leagueId,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  const [scores, crews] = await Promise.all([
    fetchSlateLiveScores(slate.games),
    fetchSlateLiveCrews(slate.games),
  ]);

  const games = mergeSlateLiveCrews(
    mergeSlateLiveScores(slate.games, scores),
    crews,
  );

  return Response.json(
    {
      ...slate,
      games,
    },
    {
      headers: {
        "Cache-Control": NO_STORE_CACHE_CONTROL,
      },
    },
  );
}
