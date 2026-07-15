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

/** Scroll so element top sits below sticky header (uses scroll-margin-top on el). */
export function scrollToElement(
  el: HTMLElement,
  behavior: ScrollBehavior = "auto",
): void {
  el.scrollIntoView({ block: "start", behavior });
}

export function scrollToId(
  id: string,
  behavior: ScrollBehavior = "auto",
  retries = 4,
): boolean {
  const el = document.getElementById(id);
  if (el) {
    scrollToElement(el, behavior);
    return true;
  }
  if (retries <= 0) return false;
  requestAnimationFrame(() => {
    scrollToId(id, behavior, retries - 1);
  });
  return false;
}
