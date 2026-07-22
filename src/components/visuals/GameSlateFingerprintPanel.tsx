"use client";

import { useEffect, useState } from "react";
import { OverlayNavLink } from "@/components/OverlayNavLink";
import { OfficiatingFingerprint } from "@/components/visuals/OfficiatingFingerprint";
import type { OfficiatingFingerprintData } from "@/lib/analytics/officiating-fingerprint";

export type CrewFingerprintEntry = {
  slug: string;
  name: string;
  role?: string;
  fingerprint: OfficiatingFingerprintData;
};

type GameSlateFingerprintPanelProps = {
  crewFingerprints: CrewFingerprintEntry[];
  basePath: string;
};

export function GameSlateFingerprintPanel({
  crewFingerprints,
  basePath,
}: GameSlateFingerprintPanelProps) {
  const [activeSlug, setActiveSlug] = useState(crewFingerprints[0]?.slug ?? "");
  const active =
    crewFingerprints.find((entry) => entry.slug === activeSlug) ??
    crewFingerprints[0] ??
    null;

  useEffect(() => {
    setActiveSlug(crewFingerprints[0]?.slug ?? "");
  }, [crewFingerprints]);

  if (!active) return null;

  return (
    <section
      className="game-slate-fingerprint-panel"
      aria-label="Officiating fingerprint"
    >
      {crewFingerprints.length > 1 ? (
        <div
          className="officiating-fingerprint-tabs"
          role="tablist"
          aria-label="Crew fingerprint selector"
        >
          {crewFingerprints.map((entry) => (
            <OverlayNavLink
              key={entry.slug}
              href={`${basePath}/refs/${entry.slug}`}
              role="tab"
              aria-selected={entry.slug === active.slug}
              className={`officiating-fingerprint-tab${
                entry.slug === active.slug ? " officiating-fingerprint-tab--active" : ""
              }`}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return;
                }
                event.preventDefault();
                setActiveSlug(entry.slug);
              }}
            >
              {entry.name}
            </OverlayNavLink>
          ))}
        </div>
      ) : null}

      <div className="officiating-fingerprint-tabpanel" role="tabpanel">
        <OfficiatingFingerprint key={active.slug} data={active.fingerprint} compact />
        <p className="officiating-fingerprint-profile-link-wrap">
          <OverlayNavLink
            href={`${basePath}/refs/${active.slug}`}
            className="officiating-fingerprint-profile-link"
          >
            Open {active.name} profile
          </OverlayNavLink>
        </p>
      </div>
    </section>
  );
}
