#!/usr/bin/env npx tsx
/**
 * Theme matrix contrast audit — screenshots key routes in light/dark/default/high
 * contrast and fails when WCAG ratios or always-dark capsule ink regress.
 *
 * Usage:
 *   npm run build:next
 *   npm run audit:theme-matrix
 *
 * Options:
 *   --base-url http://localhost:3000
 *   --output artifacts/theme-matrix
 *   --no-screenshots
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import {
  evaluateProbeMeasurement,
  measureProbe,
  summarizeMeasurements,
  type ProbeFailure,
} from "./lib/theme-matrix-browser";
import {
  THEME_MATRIX_PAGES,
  THEME_MATRIX_VARIANTS,
} from "./lib/theme-matrix-config";

const REFWATCH_A11Y_STORAGE_KEY = "refwatch-a11y";

type CliOptions = {
  baseUrl: string;
  outputDir: string;
  screenshots: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  let baseUrl = process.env.THEME_MATRIX_BASE_URL ?? "http://127.0.0.1:3099";
  let outputDir = join(process.cwd(), "artifacts", "theme-matrix");
  let screenshots = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      baseUrl = argv[index + 1] ?? baseUrl;
      index += 1;
      continue;
    }
    if (arg === "--output") {
      outputDir = argv[index + 1] ?? outputDir;
      index += 1;
      continue;
    }
    if (arg === "--no-screenshots") {
      screenshots = false;
    }
  }

  return { baseUrl, outputDir, screenshots };
}

async function waitForServer(baseUrl: string, timeoutMs = 120_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(baseUrl, { redirect: "follow" });
      if (response.ok || response.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function assertStylesheetsHealthy(baseUrl: string): Promise<void> {
  const response = await fetch(baseUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Theme matrix audit could not load ${baseUrl} (${response.status})`);
  }

  const html = await response.text();
  const stylesheets = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(
    (match) => match[1],
  );
  if (stylesheets.length === 0) {
    throw new Error("Theme matrix audit found no stylesheet links in HTML");
  }

  const broken = [];
  for (const href of stylesheets) {
    const cssResponse = await fetch(new URL(href, baseUrl), { redirect: "follow" });
    if (!cssResponse.ok) {
      broken.push(`${href} (${cssResponse.status})`);
    }
  }

  if (broken.length > 0) {
    throw new Error(
      `Theme matrix audit detected broken CSS bundles (${broken.join(", ")}). Rebuild with npm run build:next and restart the server.`,
    );
  }
}

async function startServerIfNeeded(baseUrl: string): Promise<{
  child: ChildProcess | null;
}> {
  try {
    const response = await fetch(baseUrl, { redirect: "follow" });
    if (response.ok || response.status < 500) {
      await assertStylesheetsHealthy(baseUrl);
      return { child: null };
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("broken CSS bundles")) {
      throw error;
    }
    // start local server below
  }

  const url = new URL(baseUrl);
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const child = spawn("npm", ["run", "start", "--", "-p", port], {
    cwd: process.cwd(),
    stdio: "ignore",
    env: { ...process.env, PORT: port },
  });

  await waitForServer(baseUrl);
  await assertStylesheetsHealthy(baseUrl);
  return { child };
}

const THEME_MATRIX_VISIBILITY_CSS = [
  "*, *::before, *::after {",
  "  animation: none !important;",
  "  transition: none !important;",
  "}",
  ".page-content-fade-in,",
  ".page-content-fade-in * {",
  "  opacity: 1 !important;",
  "  visibility: visible !important;",
  "}",
].join("\n");

async function ensureAuditVisibility(page: import("playwright").Page): Promise<void> {
  await page.addStyleTag({ content: THEME_MATRIX_VISIBILITY_CSS });
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>(".page-content-fade-in")) {
      element.style.opacity = "1";
      element.style.visibility = "visible";
      element.style.animation = "none";
    }
  });
}

async function captureScreenshot(
  page: import("playwright").Page,
  outputPath: string,
  selector?: string,
): Promise<void> {
  if (selector) {
    const target = page.locator(selector).first();
    const visible = await target.isVisible().catch(() => false);
    if (visible) {
      await target.screenshot({ path: outputPath });
      return;
    }
  }
  await page.screenshot({ path: outputPath, fullPage: true });
}

async function waitForReadySelector(
  page: import("playwright").Page,
  selector: string,
  timeoutMs = 45_000,
): Promise<void> {
  await page.waitForSelector(selector, { state: "attached", timeout: timeoutMs });
}

async function waitForHydratedTheme(
  page: import("playwright").Page,
  variant: { color: "light" | "dark"; contrast: "default" | "high" },
): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const root = document.documentElement;
      return (
        root.dataset.color === expected.color &&
        root.dataset.contrast === expected.contrast
      );
    },
    variant,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(750);
}

async function runAudit(browser: Browser, options: CliOptions): Promise<ProbeFailure[]> {
  const failures: ProbeFailure[] = [];
  const reportLines: string[] = [
    "# Theme matrix contrast audit",
    "",
    `Base URL: ${options.baseUrl}`,
    "",
  ];

  await mkdir(options.outputDir, { recursive: true });

  for (const pageConfig of THEME_MATRIX_PAGES) {
    reportLines.push(`## ${pageConfig.name} (${pageConfig.path})`);

    for (const variant of THEME_MATRIX_VARIANTS) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1200 },
      });
      await context.addInitScript((css) => {
        const STYLE_ID = "theme-matrix-audit-overrides";
        const inject = () => {
          if (document.getElementById(STYLE_ID)) return;
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = css;
          (document.head ?? document.documentElement).appendChild(style);
        };
        inject();
        document.addEventListener("DOMContentLoaded", inject, { once: true });
      }, THEME_MATRIX_VISIBILITY_CSS);
      await context.addInitScript((payload) => {
        localStorage.setItem(payload.key, payload.value);
      }, {
        key: REFWATCH_A11Y_STORAGE_KEY,
        value: JSON.stringify({
          contrast: variant.contrast,
          colorMode: variant.color,
          textSize: "default",
          font: "default",
        }),
      });
      const page = await context.newPage();

      await page.goto(`${options.baseUrl}${pageConfig.path}`, {
        waitUntil: "networkidle",
      });
      await waitForReadySelector(page, pageConfig.readySelector);
      await waitForHydratedTheme(page, variant);
      await ensureAuditVisibility(page);

      const screenshotPath = join(
        options.outputDir,
        `${pageConfig.name}--${variant.label}.png`,
      );
      if (options.screenshots) {
        await captureScreenshot(page, screenshotPath, pageConfig.screenshotSelector);
      }

      const measurements = [];
      for (const probe of pageConfig.probes) {
        const sample = await measureProbe(page, probe.selector);
        const result = evaluateProbeMeasurement(
          pageConfig.name,
          variant,
          probe,
          sample,
        );
        measurements.push(result.measurement);
        if (result.failure) {
          failures.push(result.failure);
        }
      }

      reportLines.push(`### ${variant.label}`);
      if (options.screenshots) {
        reportLines.push(`Screenshot: ${screenshotPath}`);
      }
      reportLines.push(summarizeMeasurements(measurements));
      reportLines.push("");

      await context.close();
    }
  }

  await writeFile(join(options.outputDir, "report.md"), `${reportLines.join("\n")}\n`, "utf8");
  return failures;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { child } = await startServerIfNeeded(options.baseUrl);

  const browser = await chromium.launch({ headless: true });
  try {
    const failures = await runAudit(browser, options);
    if (failures.length > 0) {
      console.error(`Theme matrix contrast audit failed (${failures.length} issue(s)):\n`);
      for (const failure of failures) {
        console.error(
          `  - [${failure.page} / ${failure.theme}] ${failure.probe}: ${failure.message}`,
        );
      }
      console.error(`\nSee ${join(options.outputDir, "report.md")} for details.`);
      process.exit(1);
    }

    const matrixCount =
      THEME_MATRIX_PAGES.length * THEME_MATRIX_VARIANTS.length;
    console.log(
      `Theme matrix contrast audit passed (${matrixCount} theme captures across ${THEME_MATRIX_PAGES.length} routes).`,
    );
    console.log(`Report: ${join(options.outputDir, "report.md")}`);
  } finally {
    await browser.close();
    if (child) {
      child.kill("SIGTERM");
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
