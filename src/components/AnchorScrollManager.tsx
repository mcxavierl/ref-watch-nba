"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToId, scrollToIdWhenReady } from "@/lib/scroll-offset";

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
    let cancelled = false;

    const run = async () => {
      syncScrollOffsetToken();
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      const scrolled = await scrollToIdWhenReady(hash, "smooth");
      if (cancelled) return;
      if (!scrolled) scrollToId(hash, "auto");
    };

    const cancel = runDeferredScroll(() => {
      void run();
    });

    return () => {
      cancelled = true;
      cancel();
    };
  }, [pathname]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      void scrollToIdWhenReady(hash, "smooth");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}
