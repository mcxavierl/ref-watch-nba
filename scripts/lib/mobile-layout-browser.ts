import type { Page } from "playwright";
import {
  MOBILE_LAYOUT_PAGES,
  MOBILE_TREND_MIN_HEIGHT_PX,
} from "./mobile-layout-config";

export type MobileLayoutFailure = {
  page: string;
  message: string;
};

export async function auditMobilePageLayout(
  page: Page,
  pageLabel: string,
  selectors: readonly string[],
): Promise<MobileLayoutFailure[]> {
  const failures: MobileLayoutFailure[] = [];

  const hasHorizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
  if (hasHorizontalOverflow) {
    failures.push({
      page: pageLabel,
      message: "Document has horizontal overflow at mobile viewport width",
    });
  }

  const outsideViewport = await page.evaluate((probeSelectors) => {
    const viewportWidth = window.innerWidth;
    const offenders: string[] = [];
    for (const selector of probeSelectors) {
      for (const element of document.querySelectorAll<HTMLElement>(selector)) {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.right > viewportWidth + 1 || rect.left < -1) {
          offenders.push(`${selector} (${Math.round(rect.right)}px > ${viewportWidth}px)`);
        }
      }
    }
    return offenders;
  }, selectors);

  for (const offender of outsideViewport) {
    failures.push({
      page: pageLabel,
      message: `Element extends outside viewport: ${offender}`,
    });
  }

  const shortTrendPills = await page.evaluate((minHeight) => {
    return [...document.querySelectorAll<HTMLElement>(".upcoming-game-card__trend")]
      .map((element, index) => ({
        index,
        height: element.getBoundingClientRect().height,
        text: element.textContent?.trim() ?? "",
      }))
      .filter((entry) => entry.text.length > 0 && entry.height + 0.5 < minHeight);
  }, MOBILE_TREND_MIN_HEIGHT_PX);

  for (const entry of shortTrendPills) {
    failures.push({
      page: pageLabel,
      message: `Trend pill #${entry.index + 1} is only ${entry.height.toFixed(1)}px tall (min ${MOBILE_TREND_MIN_HEIGHT_PX}px)`,
    });
  }

  const overlappingFooter = await page.evaluate(() => {
    const offenders: string[] = [];
    for (const card of document.querySelectorAll<HTMLElement>(".upcoming-game-card")) {
      const trend = card.querySelector<HTMLElement>(".upcoming-game-card__trend");
      const footer = card.querySelector<HTMLElement>(".upcoming-game-card__footer");
      if (!trend || !footer) continue;
      const trendRect = trend.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      if (footerRect.top + 1 < trendRect.bottom) {
        offenders.push(card.getAttribute("data-league") ?? "unknown-league");
      }
    }
    return offenders;
  });

  for (const league of overlappingFooter) {
    failures.push({
      page: pageLabel,
      message: `Upcoming game card trend pill overlaps footer (${league})`,
    });
  }

  return failures;
}

export async function auditMobilePreviewDrawer(page: Page): Promise<MobileLayoutFailure[]> {
  const failures: MobileLayoutFailure[] = [];
  const clientReady = await page.evaluate(() => {
    const scripts = [...document.scripts].map((script) => script.src);
    return scripts.some((src) => src.includes("/_next/static/chunks/"));
  });
  if (!clientReady) {
    return failures;
  }

  const interactiveCard = page.locator(".upcoming-game-card--interactive").first();
  const cardCount = await interactiveCard.count();
  if (cardCount === 0) {
    return failures;
  }

  await interactiveCard.scrollIntoViewIfNeeded();
  await interactiveCard.click({ timeout: 5_000 });
  await page.waitForTimeout(400);

  const drawerVisible = page.locator(".ref-preview-drawer--visible").first();
  const drawerRendered = page.locator(".ref-preview-drawer").first();
  await drawerRendered.waitFor({ state: "attached", timeout: 5_000 }).catch(() => null);
  await drawerVisible.waitFor({ state: "visible", timeout: 5_000 }).catch(() => null);
  const visible = await drawerVisible.isVisible().catch(() => false);
  if (!visible) {
    failures.push({
      page: "homepage-drawer",
      message: "Preview drawer did not open after tapping an interactive upcoming game card",
    });
    return failures;
  }

  const drawerOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    const drawer = document.querySelector<HTMLElement>(".ref-preview-drawer--visible");
    if (!drawer) return "Preview drawer missing after open";
    const rect = drawer.getBoundingClientRect();
    if (rect.right > window.innerWidth + 1 || rect.left < -1) {
      return "Preview drawer extends outside viewport";
    }
    if (root.scrollWidth > root.clientWidth + 1) {
      return "Preview drawer caused horizontal overflow";
    }
    return null;
  });

  if (drawerOverflow) {
    failures.push({
      page: "homepage-drawer",
      message: drawerOverflow,
    });
  }

  return failures;
}

export function summarizeMobileLayoutFailures(failures: MobileLayoutFailure[]): string {
  if (failures.length === 0) return "Mobile layout audit passed.";
  return failures.map((failure) => `${failure.page}: ${failure.message}`).join("\n");
}

export { MOBILE_LAYOUT_PAGES };
