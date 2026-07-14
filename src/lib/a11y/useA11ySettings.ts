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
/** User preference — `system` and `dark` resolve to dark (product default); `light` is explicit. */
export type ColorModePreference = "system" | "light" | "dark";
/** @deprecated Use ColorModePreference — kept for backward compatibility. */
export type ColorModeSetting = ColorModePreference;
export type ResolvedColorMode = "light" | "dark";
/**
 * Body/UI sans: `default` is Barlow + IBM Plex; `atkinson` enables Atkinson Hyperlegible
 * for all page text via `html[data-body-font="atkinson"]`.
 */
export type FontSetting = "default" | "atkinson";

export type A11ySettings = {
  contrast: ContrastSetting;
  colorMode: ColorModePreference;
  textSize: TextSizeSetting;
  font: FontSetting;
};

const DEFAULT_SETTINGS: A11ySettings = {
  contrast: "default",
  colorMode: "dark",
  textSize: "default",
  font: "default",
};

function normalizeColorMode(raw: unknown): ColorModePreference {
  if (raw === "system" || raw === "light" || raw === "dark") return raw;
  return "dark";
}

export function resolveColorMode(preference: ColorModePreference): ResolvedColorMode {
  if (preference === "light") return "light";
  return "dark";
}

function normalizeFromStorage(parsed: unknown): A11ySettings | null {
  if (!parsed || typeof parsed !== "object") return null;
  const v = parsed as Record<string, unknown>;
  if (v.contrast !== "default" && v.contrast !== "high") return null;
  if (v.textSize !== "default" && v.textSize !== "large") return null;
  const font: FontSetting = bodyFontFromStoredField(v.font);
  return {
    contrast: v.contrast as ContrastSetting,
    colorMode: normalizeColorMode(v.colorMode),
    textSize: v.textSize as TextSizeSetting,
    font,
  };
}

function resolveInitialSettings(): A11ySettings {
  const stored = readStoredSettings();
  if (stored) return stored;
  return { ...DEFAULT_SETTINGS };
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
  const resolved = resolveColorMode(settings.colorMode);
  root.dataset.contrast = settings.contrast;
  root.dataset.color = resolved;
  root.dataset.theme = resolved;
  root.dataset.text = settings.textSize;
  if (settings.font === "atkinson") {
    root.dataset.bodyFont = "atkinson";
  } else {
    delete root.dataset.bodyFont;
  }
  if (resolved === "dark") {
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
  setColorMode: (colorMode: ColorModePreference) => void;
  setTextSize: (textSize: TextSizeSetting) => void;
  setFont: (font: FontSetting) => void;
} {
  const [settings, setSettings] = useState<A11ySettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = resolveInitialSettings();
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

  const setColorMode = useCallback((colorMode: ColorModePreference) => {
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
