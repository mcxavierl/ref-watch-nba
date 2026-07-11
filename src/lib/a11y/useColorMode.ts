"use client";

import { useEffect, useState } from "react";
import { REFWATCH_A11Y_CHANGE_EVENT } from "@/lib/a11y/a11yStorageConstants";
import type { ColorModeSetting } from "@/lib/a11y/useA11ySettings";

export function readColorMode(): ColorModeSetting {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.color === "light" ? "light" : "dark";
}

/** Subscribes to a11y storage + `data-color` on `<html>`. */
export function useColorMode(): ColorModeSetting {
  const [colorMode, setColorMode] = useState<ColorModeSetting>("dark");

  useEffect(() => {
    setColorMode(readColorMode());
    const sync = () => setColorMode(readColorMode());
    window.addEventListener(REFWATCH_A11Y_CHANGE_EVENT, sync);
    return () => window.removeEventListener(REFWATCH_A11Y_CHANGE_EVENT, sync);
  }, []);

  return colorMode;
}
