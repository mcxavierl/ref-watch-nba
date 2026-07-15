"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { insightsViewFromPathname } from "@/lib/insights-routes";
import { scrollToId, scrollToElement } from "@/lib/scroll-offset";

function syncScrollOffsetToken(): void {
  const chrome = document.querySelector(".site-chrome");
  if (!chrome) return;
  const height = Math.ceil(chrome.getBoundingClientRect().height + 8);
  document.documentElement.style.setProperty("--site-scroll-offset", `${height}px`);
}

function runDeferredScroll(fn: () => void): () => void {
  let inner = 0;
  const outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(fn);
  });
  return () => {
    cancelAnimationFrame(outer);
    cancelAnimationFrame(inner);
  };
}

export function AnchorScrollManager() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    syncScrollOffsetToken();
    const chrome = document.querySelector(".site-chrome");
    if (!chrome || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => syncScrollOffsetToken());
    observer.observe(chrome);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return runDeferredScroll(() => {
      syncScrollOffsetToken();
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        scrollToId(hash, "auto");
        return;
      }

      const insightsView = insightsViewFromPathname(pathname);
      if (!insightsView) return;

      const panel =
        document.getElementById(`hub-panel-${insightsView}`) ??
        document.querySelector(".insights-hub-panel");
      if (panel instanceof HTMLElement) {
        scrollToElement(panel, "auto");
      }
    });
  }, [pathname]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      runDeferredScroll(() => scrollToId(hash, "smooth"));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}
