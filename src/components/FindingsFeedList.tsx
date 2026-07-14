"use client";

import {
  FindingAccordionItem,
  OfficialFindingsAccordionItem,
} from "@/components/FindingAccordion";
import type { OfficialIdentity } from "@/lib/finding-grouping";
import type { FindingEvSnapshot } from "@/lib/finding-ev-display";
import type { Finding, FindingLeague } from "@/lib/findings-shared";

export type FindingsFeedItem =
  | { kind: "official"; official: OfficialIdentity; findings: Finding[] }
  | { kind: "standalone"; finding: Finding };

export function FindingsFeedList({
  feed,
  league,
  openFirst = true,
  evByFindingId,
}: {
  feed: FindingsFeedItem[];
  league?: FindingLeague;
  openFirst?: boolean;
  evByFindingId?: Record<string, FindingEvSnapshot | null>;
}) {
  return (
    <>
      {feed.map((item, index) => {
        const defaultOpen = openFirst && index === 0;

        if (item.kind === "official") {
          return (
            <OfficialFindingsAccordionItem
              key={`official-${item.official.key}`}
              official={item.official}
              findings={item.findings}
              defaultOpen={defaultOpen}
              league={league}
              evByFindingId={evByFindingId}
            />
          );
        }

        return (
          <FindingAccordionItem
            key={item.finding.id}
            finding={item.finding}
            defaultOpen={defaultOpen}
            league={league}
            evSnapshot={evByFindingId?.[item.finding.id]}
          />
        );
      })}
    </>
  );
}
