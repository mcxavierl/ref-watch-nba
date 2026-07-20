import type { Page } from "playwright";
import {
  blendColors,
  contrastRatio,
  formatRgb,
  isLargeText,
  minContrastRatio,
  parseCssColor,
  relativeLuminance,
  type Rgb,
} from "./contrast-math";
import type { ThemeMatrixProbe, ThemeMatrixVariant } from "./theme-matrix-config";

export type ProbeMeasurement = {
  probe: ThemeMatrixProbe;
  found: boolean;
  ratio: number | null;
  foreground: string | null;
  background: string | null;
  fontSizePx: number | null;
  fontWeight: number | null;
  sampleText: string | null;
  darkSurface: boolean;
  lightInkOnDarkSurface: boolean;
};

export type ProbeFailure = {
  page: string;
  theme: string;
  probe: string;
  message: string;
};

type BrowserSample = {
  found: boolean;
  foreground: string | null;
  background: string | null;
  fontSizePx: number | null;
  fontWeight: number | null;
  sampleText: string | null;
};

export async function applyThemeMatrixVariant(
  page: Page,
  variant: ThemeMatrixVariant,
): Promise<void> {
  await page.evaluate(({ color, contrast }) => {
    const root = document.documentElement;
    root.dataset.color = color;
    root.dataset.theme = color;
    root.dataset.contrast = contrast;
    if (color === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, variant);
}

export async function measureProbe(page: Page, selector: string): Promise<BrowserSample> {
  return page.evaluate((probeSelector) => {
    const element = document.querySelector(probeSelector);
    if (!element) {
      return {
        found: false,
        foreground: null,
        background: null,
        fontSizePx: null,
        fontWeight: null,
        sampleText: null,
      };
    }

    const style = window.getComputedStyle(element);
    const fontSizePx = Number.parseFloat(style.fontSize);
    const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;

    let background: string | null = null;
    let current: Element | null = element;
    while (current) {
      const currentStyle = window.getComputedStyle(current);
      const bg = currentStyle.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        background = bg;
        break;
      }
      current = current.parentElement;
    }

    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();

    return {
      found: true,
      foreground: style.color,
      background,
      fontSizePx: Number.isFinite(fontSizePx) ? fontSizePx : null,
      fontWeight,
      sampleText: text.slice(0, 80) || null,
    };
  }, selector);
}

function evaluateProbe(
  probe: ThemeMatrixProbe,
  sample: BrowserSample,
  variant: ThemeMatrixVariant,
): { measurement: ProbeMeasurement; failure: ProbeFailure | null } {
  const measurement: ProbeMeasurement = {
    probe,
    found: sample.found,
    ratio: null,
    foreground: sample.foreground,
    background: sample.background,
    fontSizePx: sample.fontSizePx,
    fontWeight: sample.fontWeight,
    sampleText: sample.sampleText,
    darkSurface: false,
    lightInkOnDarkSurface: false,
  };

  if (!sample.found) {
    if (probe.optional) {
      return { measurement, failure: null };
    }
    return {
      measurement,
      failure: {
        page: "",
        theme: variant.label,
        probe: probe.name,
        message: `selector not found: ${probe.selector}`,
      },
    };
  }

  const foreground = sample.foreground ? parseCssColor(sample.foreground) : null;
  const background = sample.background ? parseCssColor(sample.background) : null;

  if (!foreground || !background) {
    return {
      measurement,
      failure: {
        page: "",
        theme: variant.label,
        probe: probe.name,
        message: `could not parse foreground/background (${sample.foreground ?? "none"} on ${sample.background ?? "none"})`,
      },
    };
  }

  const effectiveForeground =
    foreground.a < 1 ? blendColors(foreground, background) : foreground;
  const ratio = contrastRatio(effectiveForeground, background);
  const largeText =
    probe.largeText ??
    (sample.fontSizePx !== null && sample.fontWeight !== null
      ? isLargeText(sample.fontSizePx, sample.fontWeight)
      : false);
  const requiredRatio =
    probe.minRatio ?? minContrastRatio(largeText, variant.contrast === "high");
  const darkSurface = relativeLuminance(background) < 0.12;
  const lightInkOnDarkSurface =
    darkSurface && relativeLuminance(effectiveForeground) >= 0.55;
  const darkInkRegressionOnDarkSurface =
    variant.color === "light" &&
    darkSurface &&
    relativeLuminance(effectiveForeground) < 0.12;

  measurement.ratio = ratio;
  measurement.darkSurface = darkSurface;
  measurement.lightInkOnDarkSurface = lightInkOnDarkSurface;

  if (ratio + 0.001 < requiredRatio) {
    return {
      measurement,
      failure: {
        page: "",
        theme: variant.label,
        probe: probe.name,
        message: `contrast ${ratio.toFixed(2)}:1 below ${requiredRatio}:1 (${formatRgb(effectiveForeground)} on ${formatRgb(background)})`,
      },
    };
  }

  if (
    probe.requireLightInkOnDarkSurface &&
    darkInkRegressionOnDarkSurface
  ) {
    return {
      measurement,
      failure: {
        page: "",
        theme: variant.label,
        probe: probe.name,
        message: `light mode painted dark ink on always-dark surface (${formatRgb(effectiveForeground)} on ${formatRgb(background)})`,
      },
    };
  }

  return { measurement, failure: null };
}

export function evaluateProbeMeasurement(
  pageName: string,
  variant: ThemeMatrixVariant,
  probe: ThemeMatrixProbe,
  sample: BrowserSample,
): { measurement: ProbeMeasurement; failure: ProbeFailure | null } {
  const result = evaluateProbe(probe, sample, variant);
  if (result.failure) {
    result.failure.page = pageName;
  }
  return result;
}

export function summarizeMeasurements(measurements: ProbeMeasurement[]): string {
  return measurements
    .map((entry) => {
      const ratio = entry.ratio === null ? "n/a" : `${entry.ratio.toFixed(2)}:1`;
      return `  - ${entry.probe.name}: ${ratio}`;
    })
    .join("\n");
}
