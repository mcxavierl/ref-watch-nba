/** Programmatic full-page navigation (use instead of router.push on polled surfaces). */
export function navigateToHref(href: string): void {
  if (!href || typeof window === "undefined") return;
  window.location.assign(href);
}
