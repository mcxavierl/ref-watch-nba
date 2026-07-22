import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { navigateToHref } from "@/lib/hard-navigation";

const root = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("site navigation links", () => {
  it("uses full-page anchors instead of next/link in app components", () => {
    const offenders = [
      "src/components/SiteNav.tsx",
      "src/components/LeagueHubCard.tsx",
      "src/components/OverviewQuickLists.tsx",
      "src/components/GameSlateCard.tsx",
      "src/components/CommandPalette.tsx",
    ];
    for (const file of offenders) {
      const source = readSrc(file);
      assert.doesNotMatch(source, /from "next\/link"/, `${file} must not import next/link`);
    }
  });

  it("PrefetchLink renders hard anchors for hub and profile navigation", () => {
    const source = readSrc("src/components/PrefetchLink.tsx");
    assert.match(source, /SiteNavLink/);
    assert.doesNotMatch(source, /from "next\/link"/);
    assert.doesNotMatch(source, /useRouter/);
  });

  it("command palette navigates with hard page loads", () => {
    const source = readSrc("src/components/CommandPalette.tsx");
    assert.match(source, /navigateToHref/);
    assert.doesNotMatch(source, /router\.push/);
  });

  it("navigateToHref assigns window location", () => {
    const original = globalThis.window;
    let assigned: string | undefined;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          assign: (href: string) => {
            assigned = href;
          },
        },
      },
    });
    try {
      navigateToHref("/wnba");
      assert.equal(assigned, "/wnba");
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: original,
      });
    }
  });
});
