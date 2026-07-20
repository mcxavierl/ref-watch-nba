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
  applyThemeMatrixVariant,
  evaluateProbeMeasurement,
  measureProbe,
  summarizeMeasurements,
  type ProbeFailure,
} from "./lib/theme-matrix-browser";
import {
  THEME_MATRIX_PAGES,
  THEME_MATRIX_VARIANTS,
} from "./lib/theme-matrix-config";

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

async function startServerIfNeeded(baseUrl: string): Promise<{
  child: ChildProcess | null;
}> {
  try {
    const response = await fetch(baseUrl, { redirect: "follow" });
    if (response.ok || response.status < 500) {
      return { child: null };
    }
  } catch {
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
  return { child };
}

async function captureScreenshot(
  page: import("playwright").Page,
  outputPath: string,
  selector?: string,
): Promise<void> {
  if (selector) {
    const target = page.locator(selector).first();
    await target.screenshot({ path: outputPath });
    return;
  }
  await page.screenshot({ path: outputPath, fullPage: true });
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
      const page = await context.newPage();

      await page.goto(`${options.baseUrl}${pageConfig.path}`, {
        waitUntil: "networkidle",
      });
      await applyThemeMatrixVariant(page, variant);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector(pageConfig.readySelector, { timeout: 30_000 });

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
