"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { bodyFontFromStoredField } from "@/lib/a11y/a11yBootstrap";
import {
  REFWATCH_A11Y_CHANGE_EVENT,
  REFWATCH_A11Y_STORAGE_KEY,
} from "@/lib/a11y/a11yStorageConstants";

export { REFWATCH_A11Y_CHANGE_EVENT, REFWATCH_A11Y_STORAGE_KEY } from "@/lib/a11y/a11yStorageConstants";

export type ContrastSetting = "default" | "high";
export type TextSizeSetting = "default" | "large";
export type ColorModeSetting = "light" | "dark";
/**
 * Body/UI sans: `default` is Barlow + IBM Plex; `atkinson` enables Atkinson Hyperlegible
 * for all page text via `html[data-body-font="atkinson"]`.
 */
export type FontSetting = "default" | "atkinson";

export type A11ySettings = {
  contrast: ContrastSetting;
  colorMode: ColorModeSetting;
  textSize: TextSizeSetting;
  font: FontSetting;
};

const DEFAULT_SETTINGS: A11ySettings = {
  contrast: "default",
  colorMode: "dark",
  textSize: "default",
  font: "default",
};

function normalizeFromStorage(parsed: unknown): A11ySettings | null {
  if (!parsed || typeof parsed !== "object") return null;
  const v = parsed as Record<string, unknown>;
  if (v.contrast !== "default" && v.contrast !== "high") return null;
  if (v.textSize !== "default" && v.textSize !== "large") return null;
  if (v.colorMode !== undefined && v.colorMode !== "light" && v.colorMode !== "dark") {
    return null;
  }
  const font: FontSetting = bodyFontFromStoredField(v.font);
  return {
    contrast: v.contrast as ContrastSetting,
    colorMode: (v.colorMode === "light" ? "light" : "dark") as ColorModeSetting,
    textSize: v.textSize as TextSizeSetting,
    font,
  };
}

function readStoredSettings(): A11ySettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFWATCH_A11Y_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeFromStorage(parsed);
  } catch {
    return null;
  }
}

function writeRootDataAttributes(settings: A11ySettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.contrast = settings.contrast;
  root.dataset.color = settings.colorMode;
  root.dataset.text = settings.textSize;
  if (settings.font === "atkinson") {
    root.dataset.bodyFont = "atkinson";
  } else {
    delete root.dataset.bodyFont;
  }
  if (settings.colorMode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function persistAndNotify(settings: A11ySettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFWATCH_A11Y_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(REFWATCH_A11Y_CHANGE_EVENT));
}

export function useA11ySettings(): {
  settings: A11ySettings;
  setContrast: (contrast: ContrastSetting) => void;
  setColorMode: (colorMode: ColorModeSetting) => void;
  setTextSize: (textSize: TextSizeSetting) => void;
  setFont: (font: FontSetting) => void;
} {
  const [settings, setSettings] = useState<A11ySettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredSettings();
    const initial: A11ySettings = stored ?? DEFAULT_SETTINGS;
    setSettings(initial);
    writeRootDataAttributes(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeRootDataAttributes(settings);
    persistAndNotify(settings);
  }, [settings, hydrated]);

  const setContrast = useCallback((contrast: ContrastSetting) => {
    setSettings((prev) => ({ ...prev, contrast }));
  }, []);

  const setColorMode = useCallback((colorMode: ColorModeSetting) => {
    setSettings((prev) => ({ ...prev, colorMode }));
  }, []);

  const setTextSize = useCallback((textSize: TextSizeSetting) => {
    setSettings((prev) => ({ ...prev, textSize }));
  }, []);

  const setFont = useCallback((font: FontSetting) => {
    setSettings((prev) => ({ ...prev, font }));
  }, []);

  return useMemo(
    () => ({
      settings,
      setContrast,
      setColorMode,
      setTextSize,
      setFont,
    }),
    [settings, setContrast, setColorMode, setTextSize, setFont],
  );
}
