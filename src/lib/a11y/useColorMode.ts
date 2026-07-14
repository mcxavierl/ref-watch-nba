"use client";

import { useEffect, useState } from "react";
import { REFWATCH_A11Y_CHANGE_EVENT } from "@/lib/a11y/a11yStorageConstants";
import type { ResolvedColorMode } from "@/lib/a11y/useA11ySettings";

export function readColorMode(): ResolvedColorMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.color === "light" ? "light" : "dark";
}

/** Subscribes to a11y storage + resolved `data-color` on `<html>`. */
export function useColorMode(): ResolvedColorMode {
  const [colorMode, setColorMode] = useState<ResolvedColorMode>("dark");

  useEffect(() => {
    setColorMode(readColorMode());
    const sync = () => setColorMode(readColorMode());
    window.addEventListener(REFWATCH_A11Y_CHANGE_EVENT, sync);
    return () => window.removeEventListener(REFWATCH_A11Y_CHANGE_EVENT, sync);
  }, []);

  return colorMode;
}
