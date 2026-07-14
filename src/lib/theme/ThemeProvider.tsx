"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  useA11ySettings,
  resolveColorMode,
  type ColorModePreference,
  type ResolvedColorMode,
} from "@/lib/a11y/useA11ySettings";

export type ThemeMode = ColorModePreference;
export type { ResolvedColorMode };

type ThemeContextValue = {
  /** Stored user preference (system / light / dark). */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  /** Resolved appearance applied to the document. */
  resolvedMode: ResolvedColorMode;
  /** True when preference follows OS `prefers-color-scheme`. */
  followsSystem: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MEDIA_QUERY = "(prefers-color-scheme: light)";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, setColorMode } = useA11ySettings();
  const resolvedMode = resolveColorMode(settings.colorMode);

  const setMode = useCallback(
    (mode: ThemeMode) => {
      setColorMode(mode);
    },
    [setColorMode],
  );

  const toggleMode = useCallback(() => {
    const next =
      settings.colorMode === "dark"
        ? "light"
        : settings.colorMode === "light"
          ? "dark"
          : resolvedMode === "dark"
            ? "light"
            : "dark";
    setColorMode(next);
  }, [setColorMode, settings.colorMode, resolvedMode]);

  useEffect(() => {
    if (settings.colorMode !== "system") return;
    const media = window.matchMedia(MEDIA_QUERY);
    const onChange = () => {
      const resolved = resolveColorMode("system");
      document.documentElement.dataset.color = resolved;
      document.documentElement.dataset.theme = resolved;
      if (resolved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings.colorMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: settings.colorMode,
      setMode,
      toggleMode,
      resolvedMode,
      followsSystem: settings.colorMode === "system",
    }),
    [settings.colorMode, setMode, toggleMode, resolvedMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className="contents">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
