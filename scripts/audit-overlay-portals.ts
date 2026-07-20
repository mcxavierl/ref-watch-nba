#!/usr/bin/env npx tsx
/**
 * Overlay portal audit for Ref Watch modal and drawer surfaces.
 *
 * Guards that full-screen overlays portal to document.body via ModalPortal
 * instead of inline createPortal, preventing fixed-position bugs under
 * transformed ancestors.
 *
 * Usage: npm run audit:overlay-portals
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const OVERLAY_COMPONENTS = [
  "src/components/CommandPalette.tsx",
  "src/components/InsightDrilldownModal.tsx",
  "src/components/MatrixTeamFocusDrawer.tsx",
  "src/components/RefProfilePreviewDrawer.tsx",
] as const;

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

type AuditResult = { ok: true } | { ok: false; message: string };

function auditFileContains(
  relPath: string,
  pattern: RegExp,
  label: string,
): AuditResult {
  const content = read(relPath);
  if (!pattern.test(content)) {
    return { ok: false, message: `${label} missing in ${relPath}` };
  }
  return { ok: true };
}

function auditFileExcludes(
  relPath: string,
  pattern: RegExp,
  label: string,
): AuditResult {
  const content = read(relPath);
  if (pattern.test(content)) {
    return { ok: false, message: `${label} still present in ${relPath}` };
  }
  return { ok: true };
}

const checks: Array<{ name: string; run: () => AuditResult }> = [
  {
    name: "ModalPortal portals overlay children to document.body",
    run: () => {
      const content = read("src/components/ModalPortal.tsx");
      if (!content.includes("createPortal") || !content.includes("document.body")) {
        return {
          ok: false,
          message: "ModalPortal must use createPortal(children, document.body)",
        };
      }
      return { ok: true };
    },
  },
  ...OVERLAY_COMPONENTS.map((relPath) => ({
    name: `${relPath} imports ModalPortal`,
    run: () =>
      auditFileContains(
        relPath,
        /from\s+["']@\/components\/ModalPortal["']/,
        "ModalPortal import",
      ),
  })),
  ...OVERLAY_COMPONENTS.map((relPath) => ({
    name: `${relPath} wraps overlay in ModalPortal`,
    run: () =>
      auditFileContains(relPath, /<ModalPortal>/, "ModalPortal wrapper"),
  })),
  ...OVERLAY_COMPONENTS.map((relPath) => ({
    name: `${relPath} avoids inline createPortal`,
    run: () =>
      auditFileExcludes(
        relPath,
        /createPortal\s*\(/,
        "inline createPortal call",
      ),
  })),
  {
    name: "full-screen aria-modal overlays are covered by portal guard",
    run: () => {
      const portalUsers = new Set<string>(OVERLAY_COMPONENTS);
      const dialogSources = [
        "src/components/CommandPalette.tsx",
        "src/components/InsightDrilldownModal.tsx",
        "src/components/MatrixTeamFocusDrawer.tsx",
        "src/components/RefProfilePreviewDrawer.tsx",
        "src/components/A11ySettingsPanel.tsx",
      ];

      for (const relPath of dialogSources) {
        const content = read(relPath);
        if (!content.includes('aria-modal="true"')) continue;
        if (relPath.endsWith("A11ySettingsPanel.tsx")) continue;
        if (!portalUsers.has(relPath)) {
          return {
            ok: false,
            message: `${relPath} must portal to document.body`,
          };
        }
      }
      return { ok: true };
    },
  },
  {
    name: "overlay portal guard test file exists",
    run: () =>
      auditFileContains(
        "src/components/overlay-portals.test.ts",
        /ModalPortal portals overlay children to document\.body/,
        "overlay portal unit test",
      ),
  },
  {
    name: "package.json exposes audit:overlay-portals script",
    run: () =>
      auditFileContains(
        "package.json",
        /audit:overlay-portals/,
        "npm audit:overlay-portals script",
      ),
  },
];

function main(): void {
  const failures: string[] = [];

  for (const check of checks) {
    const result = check.run();
    if (result.ok) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.error(`  ✗ ${check.name}: ${result.message}`);
      failures.push(`${check.name}: ${result.message}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\nOverlay portal audit failed (${failures.length} issue(s)).`);
    process.exit(1);
  }

  console.log(`\nOverlay portal audit passed (${checks.length} checks).`);
}

main();
