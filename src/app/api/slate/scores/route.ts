import { fetchSlateLiveScores } from "@/lib/slate-live-scores";
import type { OverviewSlateEntry } from "@/lib/overview-slate-shared";

export const dynamic = "force-dynamic";

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
  return Response.json({ scores });
}
