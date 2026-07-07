import Link from "next/link";
import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";

const BROWSE_LINKS = (league: "NBA" | "NHL", browseHref: string) => [
  { href: "/research", label: "Research findings" },
  {
    href: league === "NBA" ? "/rankings" : "/nhl/rankings",
    label: "Referee rankings",
  },
  { href: browseHref, label: "Team crew histories" },
  {
    href: league === "NBA" ? "/refs" : "/nhl/refs",
    label: "Browse all refs",
  },
];

export function OffseasonSlateNotice({
  league,
  browseHref,
}: {
  league: "NBA" | "NHL";
  browseHref: string;
}) {
  const links = BROWSE_LINKS(league, browseHref);

  return (
    <section className="offseason-notice">
      <div className="offseason-notice-intro">
        <p className="section-kicker text-raptors">No live slate</p>
        <h2 className="section-title">
          {league} season ended — no slate tonight
        </h2>
        <p className="section-lead">
          Live crew assignments return when the {league} schedule resumes. Until then,
          use the historical board: rankings first, team/ref histories next, methodology last.
        </p>
        <div className="offseason-notice-cta">
          <SeasonNotifyCta league={league} />
        </div>
      </div>

      <div className="offseason-browse-row">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="offseason-browse-pill">
            {link.label}
          </Link>
        ))}
      </div>

      <ProComingSoonTease league={league} callout />
    </section>
  );
}
