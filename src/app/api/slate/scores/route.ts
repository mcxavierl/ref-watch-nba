import { fetchSlateLiveScores } from "@/lib/slate-live-scores";
import { fetchSlateLiveCrews } from "@/lib/slate-live-crews";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_CACHE_CONTROL =
  "no-store, no-cache, must-revalidate, proxy-revalidate";

type SlateScoresRequestBody = {
  games?: OverviewSlateEntry[];
};

export async function POST(request: Request) {
  let body: SlateScoresRequestBody;
  try {
    body = (await request.json()) as SlateScoresRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const games = body.games ?? [];
  if (games.length === 0) {
    return Response.json({ scores: [] });
  }

  const scores = await fetchSlateLiveScores(games);
  const crews = await fetchSlateLiveCrews(games);
  return Response.json(
    { scores, crews },
    {
      headers: {
        "Cache-Control": NO_STORE_CACHE_CONTROL,
      },
    },
  );
}
