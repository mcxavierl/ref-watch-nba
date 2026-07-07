import Link from "next/link";
import { RefAvatar } from "@/components/RefAvatar";
import type { TeamInsight } from "@/lib/team-insights";

export function TeamInsightCards({
  insights,
  basePath = "",
  sport = "nba",
}: {
  insights: TeamInsight[];
  basePath?: string;
  sport?: "nba" | "nhl";
}) {
  if (insights.length === 0) return null;

  return (
    <section className="section-block">
      <h2 className="section-title">Notable patterns</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="team-insight-card data-card px-4 py-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {insight.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {insight.body}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {insight.sampleGames} games in sample
            </p>
            {insight.refSlug && insight.refName && (
              <Link
                href={`${basePath}/refs/${insight.refSlug}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-900 hover:text-raptors hover:underline"
              >
                <RefAvatar
                  name={insight.refName}
                  slug={insight.refSlug}
                  sport={sport}
                  size="sm"
                />
                {insight.refName} profile →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
