import { ProComingSoonTease } from "@/components/ProComingSoonTease";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { SeasonNotifyCta } from "@/components/SeasonNotifyCta";

export function OffseasonSlateNotice({ league }: { league: "NBA" | "NHL" }) {
  return (
    <section className="offseason-notice" aria-labelledby="offseason-callout-heading">
      <div className="offseason-callout">
        <h2 id="offseason-callout-heading" className="section-title">
          {league} season ended, no slate tonight
        </h2>
        <p className="section-lead">
          Live crew assignments return when the {league} schedule resumes. Until
          then, use the historical board: rankings first, team/ref histories next,
          methodology last.
        </p>
        <div className="offseason-notice-cta">
          <SeasonNotifyCta league={league} />
        </div>
      </div>

      <BrowseActionCards league={league} />

      <ProComingSoonTease league={league} callout />
    </section>
  );
}
