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
    <div className="panel-inset px-6 py-10 text-center">
      <p className="text-lg font-bold text-zinc-900">
        {league} season ended — no slate tonight
      </p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-600">
        Tonight&apos;s slate returns when official crew assignments resume.
        Explore season highlights below, or browse ref and team histories.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <SeasonNotifyCta league={league} />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <Link
          href="/research"
          className="text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
        >
          Research findings →
        </Link>
        <Link
          href={league === "NBA" ? "/rankings" : "/nhl/rankings"}
          className="text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
        >
          Referee rankings →
        </Link>
        <Link
          href={browseHref}
          className="text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
        >
          Browse team crew histories →
        </Link>
        <Link
          href={league === "NBA" ? "/refs" : "/nhl/refs"}
          className="text-sm font-semibold text-zinc-800 hover:text-raptors hover:underline"
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
