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
  el.scrollIntoView({ behavior, block: "center" });
  applyStatCardHashFocus(el);
}

export function scrollToId(
  id: string,
  behavior: ScrollBehavior = "auto",
  retries = 4,
): boolean {
  const el = document.getElementById(id);
  if (el) {
    if (isStatCardElement(el)) {
      scrollToStatCard(el, behavior === "auto" ? "smooth" : behavior);
    } else {
      scrollToElement(el, behavior);
    }
    return true;
  }
  if (retries <= 0) return false;
  requestAnimationFrame(() => {
    scrollToId(id, behavior, retries - 1);
  });
  return false;
}

export const statCardHashFocusMs = STAT_CARD_HASH_FOCUS_MS;
