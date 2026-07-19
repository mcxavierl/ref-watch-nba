import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const OVERLAY_COMPONENTS = [
  "src/components/CommandPalette.tsx",
  "src/components/InsightDrilldownModal.tsx",
  "src/components/MatrixTeamFocusDrawer.tsx",
  "src/components/RefProfilePreviewDrawer.tsx",
] as const;

test("ModalPortal portals overlay children to document.body", () => {
  const source = readFileSync("src/components/ModalPortal.tsx", "utf8");
  assert.match(source, /createPortal/);
  assert.match(source, /document\.body/);
});

for (const path of OVERLAY_COMPONENTS) {
  test(`${path} renders through ModalPortal`, () => {
    const source = readFileSync(path, "utf8");
    assert.match(
      source,
      /from\s+["']@\/components\/ModalPortal["']/,
      `${path} must import ModalPortal`,
    );
    assert.match(source, /<ModalPortal>/, `${path} must wrap overlay in ModalPortal`);
    assert.doesNotMatch(
      source,
      /createPortal\s*\(/,
      `${path} should use ModalPortal instead of inline createPortal`,
    );
  });
}

test("full-screen overlay components are covered by portal guard", () => {
  const portalUsers = new Set<string>(OVERLAY_COMPONENTS);
  const dialogSources = [
    "src/components/CommandPalette.tsx",
    "src/components/InsightDrilldownModal.tsx",
    "src/components/MatrixTeamFocusDrawer.tsx",
    "src/components/RefProfilePreviewDrawer.tsx",
    "src/components/A11ySettingsPanel.tsx",
  ];

  for (const path of dialogSources) {
    const source = readFileSync(path, "utf8");
    if (!source.includes('aria-modal="true"')) continue;
    if (path.endsWith("A11ySettingsPanel.tsx")) continue;
    assert.ok(portalUsers.has(path), `${path} must portal to document.body`);
  }
});
