import Link from "next/link";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";

export function OffseasonSlateNotice({
  league,
  browseHref,
}: {
  league: "NBA" | "NHL";
  browseHref: string;
}) {
  return (
    <div className="empty-state-panel">
      <p className="section-kicker text-raptors">No live slate</p>
      <h2 className="section-title">
        {league} season ended — no slate tonight
      </h2>
      <p className="mx-auto section-lead">
        Live crew assignments return when the {league} schedule resumes. Until then,
        use the historical board: rankings first, team/ref histories next, methodology last.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <SeasonNotifyCta league={league} />
      </div>
      <div className="link-cluster mt-6">
        <Link
          href="/research"
          className="action-link"
        >
          Research findings →
        </Link>
        <Link
          href={league === "NBA" ? "/rankings" : "/nhl/rankings"}
          className="action-link"
        >
          Referee rankings →
        </Link>
        <Link
          href={browseHref}
          className="action-link"
        >
          Browse team crew histories →
        </Link>
        <Link
          href={league === "NBA" ? "/refs" : "/nhl/refs"}
          className="action-link"
        >
          Browse all refs →
        </Link>
      </div>
      <div className="mx-auto mt-8 max-w-xl text-left">
        <ProComingSoonTease league={league} compact />
      </div>
    </div>
  );
}
