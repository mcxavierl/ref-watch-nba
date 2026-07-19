/** Sticky site chrome clearance for in-page anchors and panel focus. */
export function readScrollOffsetPx(): number {
  if (typeof window === "undefined") return 92;
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue("--site-scroll-offset")
    .trim();
  const parsed = Number.parseFloat(token);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  const chrome = document.querySelector(".site-chrome");
  if (chrome) {
    return chrome.getBoundingClientRect().height + 8;
  }
  return 92;
}

const STAT_CARD_HASH_FOCUS_MS = 1500;
const DEFAULT_HASH_WAIT_MS = 8000;
const HASH_POLL_MS = 100;

export function isStatCardElement(el: HTMLElement): boolean {
  return (
    el.dataset.statCard === "true" ||
    el.classList.contains("stat-card") ||
    el.classList.contains("highlight-stat-card") ||
    el.classList.contains("clinical-metric-card") ||
    el.classList.contains("ref-profile-trend-card") ||
    el.classList.contains("profile-signal-card")
  );
}

export function applyStatCardHashFocus(el: HTMLElement): void {
  el.classList.add("stat-card--hash-focus");
  window.setTimeout(() => {
    el.classList.remove("stat-card--hash-focus");
  }, STAT_CARD_HASH_FOCUS_MS);
}

/** Open collapsed `<details>` ancestors so a hashed card is visible. */
export function revealHiddenStatCard(el: HTMLElement): void {
  let node: HTMLElement | null = el;
  while (node) {
    if (node instanceof HTMLDetailsElement && !node.open) {
      node.open = true;
    }
    node = node.parentElement;
  }
}

function pageSkeletonActive(): boolean {
  return Boolean(document.querySelector('.page-skeleton[aria-busy="true"]'));
}

/** Wait until route loading skeletons are replaced by real content. */
export function waitForPageContentReady(
  timeoutMs = DEFAULT_HASH_WAIT_MS,
): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!pageSkeletonActive()) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    };

    const observer = new MutationObserver(() => {
      if (!pageSkeletonActive()) finish();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = window.setTimeout(finish, timeoutMs);
  });
}

export type WaitForElementOptions = {
  timeoutMs?: number;
  pollMs?: number;
};

/** Poll and observe DOM until an element with `id` mounts (handles async RSC/hydration). */
export function waitForElementById(
  id: string,
  options?: WaitForElementOptions,
): Promise<HTMLElement | null> {
  if (typeof document === "undefined") return Promise.resolve(null);

  const timeoutMs = options?.timeoutMs ?? DEFAULT_HASH_WAIT_MS;
  const pollMs = options?.pollMs ?? HASH_POLL_MS;

  return new Promise((resolve) => {
    const existing = document.getElementById(id);
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = (el: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(timer);
      resolve(el);
    };

    const observer = new MutationObserver(() => {
      const el = document.getElementById(id);
      if (el) finish(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const interval = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el) finish(el);
    }, pollMs);

    const timer = window.setTimeout(() => finish(null), timeoutMs);
  });
}

/** Scroll so element top sits below sticky header (uses scroll-margin-top on el). */
export function scrollToElement(
  el: HTMLElement,
  behavior: ScrollBehavior = "auto",
): void {
  el.scrollIntoView({ block: "start", behavior });
}

export function scrollToStatCard(
  el: HTMLElement,
  behavior: ScrollBehavior = "smooth",
): void {
  revealHiddenStatCard(el);
  el.scrollIntoView({ behavior, block: "center" });
  applyStatCardHashFocus(el);
}

export function scrollToHashTarget(
  el: HTMLElement,
  behavior: ScrollBehavior = "auto",
): void {
  if (isStatCardElement(el)) {
    scrollToStatCard(el, behavior === "auto" ? "smooth" : behavior);
    return;
  }
  scrollToElement(el, behavior);
}

export function scrollToId(
  id: string,
  behavior: ScrollBehavior = "auto",
  retries = 4,
): boolean {
  const el = document.getElementById(id);
  if (el) {
    scrollToHashTarget(el, behavior);
    return true;
  }
  if (retries <= 0) return false;
  requestAnimationFrame(() => {
    scrollToId(id, behavior, retries - 1);
  });
  return false;
}

/** Wait for loading to finish, resolve the target element, then scroll and highlight. */
export async function scrollToIdWhenReady(
  id: string,
  behavior: ScrollBehavior = "smooth",
  options?: WaitForElementOptions,
): Promise<boolean> {
  if (!id) return false;
  await waitForPageContentReady(options?.timeoutMs);
  const el = await waitForElementById(id, options);
  if (!el) return false;
  scrollToHashTarget(el, behavior);
  return true;
}

export const statCardHashFocusMs = STAT_CARD_HASH_FOCUS_MS;
