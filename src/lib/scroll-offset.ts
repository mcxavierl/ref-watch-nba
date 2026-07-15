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

export function scrollToElement(
  el: HTMLElement,
  behavior: ScrollBehavior = "auto",
): void {
  const top = el.getBoundingClientRect().top + window.scrollY - readScrollOffsetPx();
  window.scrollTo({ top: Math.max(0, top), behavior });
}

export function scrollToId(id: string, behavior: ScrollBehavior = "auto"): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  scrollToElement(el, behavior);
  return true;
}
