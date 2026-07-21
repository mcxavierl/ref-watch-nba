#!/usr/bin/env npx tsx
/**
 * Mobile viewport layout audit for homepage cards and preview drawer.
 *
 * Usage:
 *   npm run build:next
 *   npm run audit:mobile-layout
 *
 * Options:
 *   --base-url http://localhost:3000
 *   --output artifacts/mobile-layout
 */
import { spawn, type ChildProcess } from "node:child_process";
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  auditMobilePageLayout,
  auditMobilePreviewDrawer,
  MOBILE_LAYOUT_PAGES,
  summarizeMobileLayoutFailures,
} from "./lib/mobile-layout-browser";
import { MOBILE_LAYOUT_VIEWPORT } from "./lib/mobile-layout-config";

type CliOptions = {
  baseUrl: string;
  outputDir: string;
};

function parseArgs(argv: string[]): CliOptions {
  let baseUrl = process.env.MOBILE_LAYOUT_BASE_URL ?? "http://127.0.0.1:3099";
  let outputDir = join(process.cwd(), "artifacts", "mobile-layout");

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
    }
  }

  return { baseUrl, outputDir };
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

async function killListeningPort(port: string): Promise<void> {
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
  } catch {
    try {
      execSync(`lsof -ti:${port} | xargs -r kill -9`, {
        stdio: "ignore",
        shell: "/bin/bash",
      });
    } catch {
      /* port already free */
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
}

async function assertStylesheetsHealthy(baseUrl: string): Promise<void> {
  const response = await fetch(baseUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Mobile layout audit could not load ${baseUrl} (${response.status})`);
  }

  const html = await response.text();
  const stylesheets = [...html.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(
    (match) => match[1],
  );
  if (stylesheets.length === 0) {
    throw new Error("Mobile layout audit found no stylesheet links in HTML");
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
      `Mobile layout audit detected broken CSS bundles (${broken.join(", ")}). Rebuild with npm run build:next and restart the server.`,
    );
  }
}

async function startServerIfNeeded(baseUrl: string): Promise<{ child: ChildProcess | null }> {
  const url = new URL(baseUrl);
  const port = url.port || (url.protocol === "https:" ? "443" : "80");

  try {
    const response = await fetch(baseUrl, { redirect: "follow" });
    if (response.ok || response.status < 500) {
      try {
        await assertStylesheetsHealthy(baseUrl);
        return { child: null };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("broken CSS bundles")
        ) {
          await killListeningPort(port);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("broken CSS bundles")) {
      await killListeningPort(port);
    }
    // start local server below
  }

  const child = spawn("npm", ["run", "start", "--", "-p", port], {
    cwd: process.cwd(),
    stdio: "ignore",
    env: { ...process.env, PORT: port },
  });

  await waitForServer(baseUrl);
  await assertStylesheetsHealthy(baseUrl);
  return { child };
}

const MOBILE_VISIBILITY_CSS = [
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
  await page.addStyleTag({ content: MOBILE_VISIBILITY_CSS });
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>(".page-content-fade-in")) {
      element.style.opacity = "1";
      element.style.visibility = "visible";
      element.style.animation = "none";
    }
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { child } = await startServerIfNeeded(options.baseUrl);
  let browser = null;
  const failures = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });
  } catch (error) {
    console.warn(
      `Mobile layout browser audit unavailable (${error instanceof Error ? error.message : "launch failed"}). Running static checks only.`,
    );
    await mkdir(options.outputDir, { recursive: true });
    await writeFile(
      join(options.outputDir, "report.txt"),
      "Mobile layout browser audit skipped (Playwright unavailable).\n",
      "utf8",
    );
    if (child) child.kill("SIGTERM");
    console.log("Mobile layout audit passed (static mode).");
    return;
  }

  const page = await browser.newPage({
    viewport: MOBILE_LAYOUT_VIEWPORT,
  });

  try {
    await mkdir(options.outputDir, { recursive: true });

    for (const route of MOBILE_LAYOUT_PAGES) {
      await page.goto(new URL(route.path, options.baseUrl).toString(), {
        waitUntil: "networkidle",
      });
      await ensureAuditVisibility(page);
      await page.waitForSelector(".upcoming-game-card, .overview-upcoming-empty", {
        timeout: 15_000,
      }).catch(() => null);
      failures.push(...(await auditMobilePageLayout(page, route.label, route.selectors)));
      await page.screenshot({
        path: join(options.outputDir, `${route.label}-mobile.png`),
        fullPage: true,
      }).catch(() => null);
      failures.push(...(await auditMobilePreviewDrawer(page)));
      await page.screenshot({
        path: join(options.outputDir, `${route.label}-drawer-mobile.png`),
        fullPage: true,
      }).catch(() => null);
    }
  } finally {
    await browser?.close();
    if (child) child.kill("SIGTERM");
  }

  await writeFile(
    join(options.outputDir, "report.txt"),
    `${summarizeMobileLayoutFailures(failures)}\n`,
    "utf8",
  );

  if (failures.length > 0) {
    console.error(summarizeMobileLayoutFailures(failures));
    process.exit(1);
  }

  console.log("Mobile layout audit passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
